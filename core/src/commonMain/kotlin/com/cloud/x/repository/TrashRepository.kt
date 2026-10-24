package com.cloud.x.repository

import com.cloud.x.model.FileEntry
import com.cloud.x.util.currentTimeMillis
import com.cloud.x.util.MetadataManager
import com.cloud.x.util.SupabaseManager
import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.firestore.FieldValue
import dev.gitlive.firebase.firestore.firestore
import dev.gitlive.firebase.firestore.Timestamp
import io.github.jan.supabase.storage.storage
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class TrashRepository {
    private val firestore = Firebase.firestore
    private val supabase = SupabaseManager.client
    private val activityRepository = UserActivityRepository()

    /**
     * Soft Delete: Moves from user_files to trash_files, decrements storage and folder sizes.
     */
    suspend fun moveToTrash(userId: String, fileId: String): Result<Unit> {
        return try {
            val userRef = firestore.collection("users").document(userId)
            val fileRef = userRef.collection("user_files").document(fileId)
            val trashRef = userRef.collection("trash_files").document(fileId)

            val fileSnapshot = fileRef.get()
            if (!fileSnapshot.exists) return Result.failure(Exception("File not found"))

            val fileData = fileSnapshot.data<FileEntry>()
            val trashData = fileData.copy(
                isDeleted = true,
                deletedTimestamp = Timestamp.now(),
            )

            val batch = firestore.batch()
            batch.set(trashRef, trashData)
            batch.delete(fileRef)
            batch.update(userRef, "storageUsed" to FieldValue.increment(-fileData.fileSize.toDouble()))
            
            batch.commit()

            // Update parent folder sizes
            if ((fileData.parentId.isNotEmpty()) && (fileData.parentId != "root")) {
                MetadataManager.updateParentFolderSizes(userId, fileData.parentId, -fileData.fileSize)
            }

            // Log Activity
            activityRepository.logActivity(userId, "DELETE", "Moved to trash", fileData.fileName)

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun batchMoveToTrash(userId: String, fileIds: List<String>): Result<Unit> {
        return try {
            for (fileId in fileIds) {
                moveToTrash(userId, fileId)
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Restore from Trash: Reverses soft delete.
     */
    suspend fun restoreFromTrash(userId: String, fileId: String): Result<Unit> {
        return try {
            val userRef = firestore.collection("users").document(userId)
            val fileRef = userRef.collection("user_files").document(fileId)
            val trashRef = userRef.collection("trash_files").document(fileId)

            val trashSnapshot = trashRef.get()
            if (!trashSnapshot.exists) return Result.failure(Exception("File not found in trash"))

            val trashData = trashSnapshot.data<FileEntry>()
            val fileData = trashData.copy(
                isDeleted = false,
                deletedTimestamp = null
            )

            val batch = firestore.batch()
            batch.set(fileRef, fileData)
            batch.delete(trashRef)
            batch.update(userRef, "storageUsed" to FieldValue.increment(trashData.fileSize.toDouble()))

            batch.commit()

            // Update parent folder sizes
            if ((fileData.parentId.isNotEmpty()) && (fileData.parentId != "root")) {
                MetadataManager.updateParentFolderSizes(userId, fileData.parentId, fileData.fileSize)
            }

            // Log Activity
            activityRepository.logActivity(userId, "RESTORE", "Restored from trash", fileData.fileName)

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Permanent Deletion: Complete removal from Supabase and Firestore.
     */
    suspend fun permanentlyDelete(userId: String, file: FileEntry): Result<Unit> {
        return try {
            // 1. Delete from Supabase Storage ('files' bucket)
            val path = file.storagePath.ifEmpty { "$userId/${file.fileId}-${file.fileName}" }
            supabase.storage["files"].delete(path)

            // 2. Delete from Firestore Trash Collection
            firestore.collection("users").document(userId)
                .collection("trash_files").document(file.fileId).delete()

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun getTrashFiles(userId: String): Flow<List<FileEntry>> {
        return firestore.collection("users").document(userId)
            .collection("trash_files").snapshots().map { snapshot ->
                snapshot.documents.map { it.data<FileEntry>() }
            }
    }
}
