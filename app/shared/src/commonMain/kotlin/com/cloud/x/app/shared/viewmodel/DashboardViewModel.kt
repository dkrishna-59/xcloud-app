package com.cloud.x.app.shared.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cloud.x.model.FileEntry
import com.cloud.x.model.Invitation
import com.cloud.x.model.UserActivity
import com.cloud.x.model.UserDevice
import com.cloud.x.model.UserMetadata
import com.cloud.x.repository.UserActivityRepository
import com.cloud.x.repository.AuthRepository
import com.cloud.x.repository.FileRepository
import com.cloud.x.repository.TrashRepository
import com.cloud.x.repository.UserRepository
import com.cloud.x.util.FileUploadManager
import com.cloud.x.util.OfflineManager
import com.cloud.x.util.StorageQuotaManager
import com.cloud.x.util.currentTimeMillis
import dev.gitlive.firebase.firestore.Timestamp
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class DashboardViewModel(
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository,
    private val fileRepository: FileRepository,
    private val trashRepository: TrashRepository
) : ViewModel() {

    private val uploadManager = FileUploadManager(fileRepository)
    private val activityRepository = UserActivityRepository()
    
    val offlineFiles = OfflineManager.cachedFiles

    private val _userMetadata = MutableStateFlow<UserMetadata?>(null)
    val userMetadata: StateFlow<UserMetadata?> = _userMetadata.asStateFlow()

    private val _files = MutableStateFlow<List<FileEntry>>(emptyList())
    val files: StateFlow<List<FileEntry>> = _files.asStateFlow()

    private val _trashFiles = MutableStateFlow<List<FileEntry>>(emptyList())
    val trashFiles: StateFlow<List<FileEntry>> = _trashFiles.asStateFlow()

    private val _activities = MutableStateFlow<List<UserActivity>>(emptyList())
    val activities: StateFlow<List<UserActivity>> = _activities.asStateFlow()

    private val _sentInvitations = MutableStateFlow<List<Invitation>>(emptyList())
    val sentInvitations = _sentInvitations.asStateFlow()

    private val _receivedInvitations = MutableStateFlow<List<Invitation>>(emptyList())
    val receivedInvitations = _receivedInvitations.asStateFlow()

    private val _devices = MutableStateFlow<List<UserDevice>>(emptyList())
    val devices = _devices.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery = _searchQuery.asStateFlow()

    private val _currentFolderId = MutableStateFlow("root")
    val currentFolderId = _currentFolderId.asStateFlow()

    private val _breadcrumbs = MutableStateFlow(listOf(Breadcrumb("root", "My Cloud")))
    val breadcrumbs = _breadcrumbs.asStateFlow()

    private val _selectedCategory = MutableStateFlow("All")
    val selectedCategory = _selectedCategory.asStateFlow()

    val starredFiles = _files.map { list ->
        list.filter { it.isStarred && !it.isDeleted }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val sharedFiles = _files.map { list ->
        list.filter { it.isShared && !it.isDeleted }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val filteredFiles = combine(_files, _searchQuery, _selectedCategory, _currentFolderId) { files, query, category, folderId ->
        files.filter { file ->
            val matchesQuery = file.fileName.contains(query, ignoreCase = true)
            val matchesCategory = if (category == "All") true else {
                file.fileType.contains(category, ignoreCase = true)
            }
            val matchesFolder = if (query.isNotEmpty()) true else file.parentId == folderId
            
            matchesQuery && matchesCategory && matchesFolder && !file.isDeleted
        }.sortedWith { a, b ->
            // Folders first
            if (a.fileType == "Folder" && b.fileType != "Folder") -1
            else if (a.fileType != "Folder" && b.fileType == "Folder") 1
            else b.uploadTimestamp.seconds.compareTo(a.uploadTimestamp.seconds)
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    data class Breadcrumb(val id: String, val name: String)

    fun navigateToFolder(folder: FileEntry) {
        // Update last opened for folder
        updateLastOpened(folder)
        
        _currentFolderId.value = folder.fileId
        val current = _breadcrumbs.value.toMutableList()
        current.add(Breadcrumb(folder.fileId, folder.fileName))
        _breadcrumbs.value = current
    }

    fun onFileClick(file: FileEntry) {
        updateLastOpened(file)
    }

    private fun updateLastOpened(file: FileEntry) {
        val user = authRepository.getCurrentUser() ?: return
        viewModelScope.launch {
            fileRepository.updateLastOpened(user.uid, file.fileId)
        }
    }

    fun navigateToBreadcrumb(index: Int) {
        val target = _breadcrumbs.value[index]
        _currentFolderId.value = target.id
        _breadcrumbs.value = _breadcrumbs.value.take(index + 1)
    }

    val storageBreakdown = _files.map { fileList ->
        val breakdown = UserMetadata.StorageBreakdown()
        var images = 0L
        var videos = 0L
        var audio = 0L
        var documents = 0L
        var others = 0L

        fileList.filter { !it.isDeleted }.forEach { file ->
            when {
                file.fileType.contains("image", true) -> images += file.fileSize
                file.fileType.contains("video", true) -> videos += file.fileSize
                file.fileType.contains("audio", true) -> audio += file.fileSize
                file.fileType.contains("pdf", true) || 
                file.fileType.contains("doc", true) || 
                file.fileType.contains("text", true) -> documents += file.fileSize
                else -> others += file.fileSize
            }
        }
        UserMetadata.StorageBreakdown(images, videos, documents, audio, others)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), UserMetadata.StorageBreakdown())

    private val _uploadStatus = MutableStateFlow<FileUploadManager.UploadStatus?>(null)
    val uploadStatus: StateFlow<FileUploadManager.UploadStatus?> = _uploadStatus.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing = _isRefreshing.asStateFlow()

    init {
        loadData()
    }

    fun refresh() {
        viewModelScope.launch {
            _isRefreshing.value = true
            loadData()
            // Simulate a small delay for better UX if data is already cached
            delay(500)
            _isRefreshing.value = false
        }
    }

    private fun loadData() {
        val user = authRepository.getCurrentUser() ?: return
        
        // 1. Register this device node
        viewModelScope.launch {
            val deviceId = "android_${user.uid.take(5)}_${(100..999).random()}"
            val device = UserDevice(
                deviceId = deviceId,
                name = "Android Smartphone",
                type = "Android",
                lastActive = Timestamp.now(),
                ip = "192.168.1.x", // Placeholder for now
                location = "Local Mesh",
                isCurrent = true
            )
            userRepository.registerDevice(user.uid, device)
        }

        viewModelScope.launch {
            userRepository.observeUserMetadata(user.uid)
                .catch { e -> println("[DASHBOARD] Metadata sync failed: ${e.message}") }
                .collectLatest {
                    _userMetadata.value = it ?: UserMetadata(uid = user.uid, email = user.email ?: "")
                }
        }
        viewModelScope.launch {
            fileRepository.getFiles(user.uid)
                .catch { e -> println("[DASHBOARD] File sync failed: ${e.message}") }
                .collectLatest {
                    _files.value = it.sortedByDescending { f -> f.uploadTimestamp.seconds }
                }
        }
        viewModelScope.launch {
            trashRepository.getTrashFiles(user.uid)
                .catch { e -> println("[DASHBOARD] Trash sync failed: ${e.message}") }
                .collectLatest {
                    _trashFiles.value = it.sortedByDescending { f -> f.deletedTimestamp?.seconds ?: 0L }
                }
        }
        viewModelScope.launch {
            activityRepository.getRecentActivities(user.uid)
                .catch { e -> println("[DASHBOARD] Activity sync failed: ${e.message}") }
                .collectLatest {
                    _activities.value = it
                }
        }
        viewModelScope.launch {
            fileRepository.getSentInvitations(user.uid)
                .catch { e -> println("[DASHBOARD] Sent invite sync failed: ${e.message}") }
                .collectLatest {
                    _sentInvitations.value = it
                }
        }
        user.email?.let { email ->
            viewModelScope.launch {
                fileRepository.getReceivedInvitations(email)
                    .catch { e -> println("[DASHBOARD] Recv invite sync failed: ${e.message}") }
                    .collectLatest {
                        _receivedInvitations.value = it
                    }
            }
        }
        viewModelScope.launch {
            try {
                userRepository.observeDevices(user.uid)
                    .catch { e -> println("[DASHBOARD] Device sync failed: ${e.message}") }
                    .collectLatest {
                        _devices.value = it
                    }
            } catch (e: Exception) {
                println("[DASHBOARD] Device launch failed: ${e.message}")
            }
        }
    }

    fun inviteUser(file: FileEntry, email: String, phone: String?, passcode: String?, expiryHours: Int) {
        val user = _userMetadata.value ?: return
        viewModelScope.launch {
            fileRepository.createInvitation(user, file, email, phone, passcode, expiryHours)
        }
    }

    fun removeCollaborator(file: FileEntry, email: String) {
        val user = authRepository.getCurrentUser() ?: return
        viewModelScope.launch {
            fileRepository.removeCollaborator(user.uid, file.fileId, email)
        }
    }

    fun revokeInvitation(invitation: Invitation) {
        viewModelScope.launch {
            fileRepository.revokeInvitation(invitation)
        }
    }

    fun acceptInvitation(invitation: Invitation) {
        val user = authRepository.getCurrentUser() ?: return
        viewModelScope.launch {
            fileRepository.acceptInvitation(invitation, user.uid, user.email ?: "")
        }
    }

    fun disconnectDevice(device: UserDevice) {
        val user = authRepository.getCurrentUser() ?: return
        viewModelScope.launch {
            userRepository.disconnectDevice(user.uid, device.deviceId)
        }
    }

    fun uploadFile(name: String, mimeType: String, size: Long, data: ByteArray) {
        val user = authRepository.getCurrentUser() ?: return
        val metadata = _userMetadata.value ?: UserMetadata(uid = user.uid)

        viewModelScope.launch {
            uploadManager.uploadFile(user.uid, metadata, name, mimeType, size, data).collect { status ->
                _uploadStatus.value = status
            }
        }
    }

    fun deleteFile(file: FileEntry) {
        val user = authRepository.getCurrentUser() ?: return
        viewModelScope.launch {
            trashRepository.moveToTrash(user.uid, file.fileId)
        }
    }

    fun batchDeleteFiles(fileIds: List<String>) {
        val user = authRepository.getCurrentUser() ?: return
        viewModelScope.launch {
            trashRepository.batchMoveToTrash(user.uid, fileIds)
        }
    }

    fun batchMoveFiles(fileIds: List<String>, targetFolderId: String) {
        val user = authRepository.getCurrentUser() ?: return
        viewModelScope.launch {
            fileRepository.batchMoveFiles(user.uid, fileIds, targetFolderId)
        }
    }

    fun batchStarFiles(fileIds: List<String>) {
        val user = authRepository.getCurrentUser() ?: return
        viewModelScope.launch {
            fileRepository.batchStarFiles(user.uid, fileIds)
        }
    }

    fun customizeFolder(folderId: String, color: String, icon: String) {
        val user = authRepository.getCurrentUser() ?: return
        viewModelScope.launch {
            fileRepository.customizeFolder(user.uid, folderId, color, icon)
        }
    }

    fun markActivitiesAsRead() {
        val user = authRepository.getCurrentUser() ?: return
        viewModelScope.launch {
            activityRepository.markAllAsRead(user.uid, _activities.value)
        }
    }

    fun deletePermanently(file: FileEntry) {
        val user = authRepository.getCurrentUser() ?: return
        viewModelScope.launch {
            trashRepository.permanentlyDelete(user.uid, file)
        }
    }

    fun restoreFromTrash(file: FileEntry) {
        val user = authRepository.getCurrentUser() ?: return
        viewModelScope.launch {
            trashRepository.restoreFromTrash(user.uid, file.fileId)
        }
    }

    fun renameFile(file: FileEntry, newName: String) {
        val user = authRepository.getCurrentUser() ?: return
        viewModelScope.launch {
            fileRepository.renameFile(user.uid, file.fileId, newName)
        }
    }

    fun moveFile(file: FileEntry, targetFolderId: String) {
        val user = authRepository.getCurrentUser() ?: return
        viewModelScope.launch {
            // Reusing rename structure for parentId update
            fileRepository.moveFile(user.uid, file.fileId, targetFolderId)
        }
    }

    fun onSearchQueryChange(query: String) {
        _searchQuery.value = query
    }

    fun onCategorySelect(category: String) {
        _selectedCategory.value = category
    }

    fun toggleStar(file: FileEntry) {
        val user = authRepository.getCurrentUser() ?: return
        viewModelScope.launch {
            fileRepository.toggleStar(user.uid, file.fileId, !file.isStarred)
        }
    }

    fun toggleOffline(file: FileEntry) {
        viewModelScope.launch {
            if (file.isOffline) {
                OfflineManager.removeFromOffline(file.fileId)
            } else {
                OfflineManager.downloadForOffline(file)
            }
            // Update Firestore to sync across devices
            val user = authRepository.getCurrentUser() ?: return@launch
            firestoreUpdateOfflineStatus(user.uid, file.fileId, !file.isOffline)
        }
    }

    private suspend fun firestoreUpdateOfflineStatus(userId: String, fileId: String, status: Boolean) {
        // This is just to keep the 'isOffline' flag in sync across devices
        // The actual file is local to the device
        fileRepository.toggleOfflineFlag(userId, fileId, status)
    }

    fun generateShareLink(file: FileEntry, passcode: String?, expiryDays: Int?) {
        val user = authRepository.getCurrentUser() ?: return
        viewModelScope.launch {
            fileRepository.generateShareLink(user.uid, file.fileId, passcode, expiryDays)
        }
    }
}
