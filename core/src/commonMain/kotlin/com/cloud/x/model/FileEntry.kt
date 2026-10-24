package com.cloud.x.model

import dev.gitlive.firebase.firestore.Timestamp
import kotlinx.serialization.Serializable

@Serializable
data class Collaborator(
    val email: String = "",
    val role: String = "viewer"
)

@Serializable
data class FileEntry(
    val fileId: String = "",
    val fileName: String = "",
    val fileType: String = "",
    val fileSize: Long = 0,
    val downloadUrl: String = "",
    val uploadTimestamp: Timestamp = Timestamp.now(),
    val ownerId: String = "",
    val storagePath: String = "",
    val parentId: String = "root",
    val isDeleted: Boolean = false,
    val deletedTimestamp: Timestamp? = null,
    val isOffline: Boolean = false,
    val isStarred: Boolean = false,
    val isShared: Boolean = false,
    val shareId: String? = null,
    val passcode: String? = null,
    val expiryTimestamp: Timestamp? = null,
    val lastOpenedTimestamp: Timestamp? = null,
    val isLocked: Boolean = false,
    val folderColor: String? = null,
    val folderIcon: String? = null,
    val sharedWithEmails: List<String> = emptyList(),
    val sharedWith: List<Collaborator>? = emptyList()
)
