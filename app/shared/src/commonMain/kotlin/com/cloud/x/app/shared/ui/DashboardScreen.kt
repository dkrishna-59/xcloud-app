package com.cloud.x.app.shared.ui

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.cloud.x.app.shared.ui.components.ShareSheet
import com.cloud.x.app.shared.ui.components.StorageBreakdownWidget
import com.cloud.x.app.shared.ui.components.FolderCustomizeSheet
import com.cloud.x.app.shared.viewmodel.DashboardViewModel
import com.cloud.x.app.shared.viewmodel.StorageViewModel
import com.cloud.x.model.FileEntry
import com.cloud.x.model.Invitation
import com.cloud.x.model.UserActivity
import com.cloud.x.model.UserDevice
import com.cloud.x.model.UserMetadata
import com.cloud.x.repository.AuthRepository
import com.cloud.x.util.FileUploadManager
import com.cloud.x.util.StorageQuotaManager
import kotlinx.coroutines.launch

enum class DashboardTab(val label: String, val icon: ImageVector, val selectedIcon: ImageVector) {
    Home("Home", Icons.Outlined.Home, Icons.Filled.Home),
    Favourites("Favourites", Icons.Outlined.StarBorder, Icons.Filled.Star),
    Shared("Shared", Icons.Outlined.People, Icons.Filled.People),
    Files("Files", Icons.Outlined.Folder, Icons.Filled.Folder)
}

@Composable
fun FileItemSkeleton(isGrid: Boolean = false) {
    val infiniteTransition = rememberInfiniteTransition()
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 0.7f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        )
    )

    if (isGrid) {
        Surface(
            modifier = Modifier.width(140.dp).height(140.dp),
            shape = RoundedCornerShape(20.dp),
            color = MaterialTheme.colorScheme.surfaceContainerLow.copy(alpha = alpha),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.2f))
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                Box(
                    modifier = Modifier.fillMaxWidth().height(80.dp).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceContainerHigh)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Box(modifier = Modifier.width(80.dp).height(12.dp).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f)))
            }
        }
    } else {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(modifier = Modifier.size(48.dp).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceContainerHigh))
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Box(modifier = Modifier.width(120.dp).height(14.dp).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f)))
                Spacer(modifier = Modifier.height(4.dp))
                Box(modifier = Modifier.width(60.dp).height(10.dp).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.05f)))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel,
    storageViewModel: StorageViewModel,
    isDarkTheme: Boolean = false,
    onThemeToggle: () -> Unit = {},
    onSignOutClick: () -> Unit = {},
    onPickFileClick: (onFilePicked: (String, String, Long, ByteArray) -> Unit) -> Unit = { _ -> },
    onPickAvatarClick: (onAvatarPicked: (String, String, Long, ByteArray) -> Unit) -> Unit = { _ -> },
    onScanClick: (onScanComplete: (String, String, Long, ByteArray) -> Unit) -> Unit = { _ -> },
    onBiometricAuthClick: (title: String, subtitle: String, onSuccess: () -> Unit, onError: (String) -> Unit) -> Unit = { _, _, _, _ -> },
    onUploadStatusChange: (FileUploadManager.UploadStatus) -> Unit = { _ -> }
) {
    val userMetadata by storageViewModel.userMetadata.collectAsState()
    val isUpdating by storageViewModel.isUpdating.collectAsState()
    val filteredFiles by viewModel.filteredFiles.collectAsState()
    val starredFiles by viewModel.starredFiles.collectAsState()
    val sharedFiles by viewModel.sharedFiles.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val storageBreakdown by viewModel.storageBreakdown.collectAsState()
    val uploadStatus by viewModel.uploadStatus.collectAsState()
    val activities by viewModel.activities.collectAsState(emptyList())
    val sentInvitations by viewModel.sentInvitations.collectAsState()
    val receivedInvitations by viewModel.receivedInvitations.collectAsState()
    val devices by viewModel.devices.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()

    // Notify native platform of upload status changes
    LaunchedEffect(uploadStatus) {
        uploadStatus?.let { onUploadStatusChange(it) }
    }

    var currentTab by remember { mutableStateOf(DashboardTab.Home) }
    var showProfileSheet by remember { mutableStateOf(value = false) }
    var showActivitySheet by remember { mutableStateOf(false) }
    var showDevicesSheet by remember { mutableStateOf(false) }
    var showUploadSheet by remember { mutableStateOf(false) }
    var showTrashScreen by remember { mutableStateOf(false) }
    var showResetPasswordDialog by remember { mutableStateOf(false) }
    var showChangePasswordDialog by remember { mutableStateOf(false) }
    var showEditProfileDialog by remember { mutableStateOf(false) }
    var editProfileError by remember { mutableStateOf<String?>(null) }
    var shareFile by remember { mutableStateOf<FileEntry?>(null) }
    var selectedFileForAction by remember { mutableStateOf<FileEntry?>(null) }
    var previewFile by remember { mutableStateOf<FileEntry?>(null) }
    var fileToRename by remember { mutableStateOf<FileEntry?>(null) }
    var fileToMove by remember { mutableStateOf<FileEntry?>(null) }
    var fileToCustomize by remember { mutableStateOf<FileEntry?>(null) }
    var fileInfoToShow by remember { mutableStateOf<FileEntry?>(null) }
    var showStorageAnalyticsSheet by remember { mutableStateOf(false) }
    
    // Batch Operations State
    var selectedFileIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    var isBatchMoving by remember { mutableStateOf(false) }

    val profileSheetState = rememberModalBottomSheetState()
    val activitySheetState = rememberModalBottomSheetState()
    val devicesSheetState = rememberModalBottomSheetState()
    val uploadSheetState = rememberModalBottomSheetState()
    val shareSheetState = rememberModalBottomSheetState()
    val actionSheetState = rememberModalBottomSheetState()
    val moveSheetState = rememberModalBottomSheetState()
    val customizeSheetState = rememberModalBottomSheetState()
    val storageAnalyticsSheetState = rememberModalBottomSheetState()

    val unreadActivitiesCount = activities.count { !it.isRead }
    val scope = rememberCoroutineScope()

    fun toggleSelection(fileId: String) {
        selectedFileIds = if (selectedFileIds.contains(fileId)) {
            selectedFileIds - fileId
        } else {
            selectedFileIds + fileId
        }
    }

    if (previewFile != null) {
        FilePreviewScreen(file = previewFile!!) {
            previewFile = null
        }
        return
    }

    if (showTrashScreen) {
        TrashScreen(viewModel, onDismiss = { showTrashScreen = false })
        return
    }

    if (showResetPasswordDialog) {
        AlertDialog(
            onDismissRequest = { showResetPasswordDialog = false },
            title = { Text("Reset Access Key") },
            text = { Text("A password reset link will be sent to your primary vault email address. Execute protocol?") },
            confirmButton = {
                Button(
                    onClick = {
                        userMetadata?.email?.let { 
                            scope.launch {
                                AuthRepository().resetPassword(it)
                            }
                        }
                        showResetPasswordDialog = false
                    }
                ) {
                    Text("Execute")
                }
            },
            dismissButton = {
                TextButton(onClick = { showResetPasswordDialog = false }) { Text("Abort") }
            }
        )
    }

    if (showChangePasswordDialog) {
        var currentPass by remember { mutableStateOf("") }
        var newPass by remember { mutableStateOf("") }
        var confirmPass by remember { mutableStateOf("") }
        
        AlertDialog(
            onDismissRequest = { showChangePasswordDialog = false },
            title = { Text("Change Vault Password") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = currentPass,
                        onValueChange = { currentPass = it },
                        label = { Text("Current Password") },
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = newPass,
                        onValueChange = { newPass = it },
                        label = { Text("New Password") },
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = confirmPass,
                        onValueChange = { confirmPass = it },
                        label = { Text("Confirm New Password") },
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            val res = AuthRepository().updatePassword(currentPass, newPass)
                            if (res.isSuccess) {
                                showChangePasswordDialog = false
                            } else {
                                // Error feedback would go here
                            }
                        }
                    },
                    enabled = newPass.isNotEmpty() && newPass == confirmPass && currentPass.isNotEmpty()
                ) {
                    Text("Update Key")
                }
            },
            dismissButton = {
                TextButton(onClick = { showChangePasswordDialog = false }) { Text("Cancel") }
            }
        )
    }


    Scaffold(
        topBar = {
            Column {
                Box(modifier = Modifier.statusBarsPadding()) {
                    DriveSearchBar(
                        query = searchQuery,
                        onQueryChange = { viewModel.onSearchQueryChange(it) },
                        userMetadata = userMetadata,
                        isDarkTheme = isDarkTheme,
                        unreadCount = unreadActivitiesCount,
                        isRefreshing = isRefreshing,
                        onThemeToggle = onThemeToggle,
                        onNotificationClick = { showActivitySheet = true },
                        onProfileClick = { showProfileSheet = true }
                    )
                }
                
                if (selectedFileIds.isNotEmpty()) {
                    com.cloud.x.app.shared.ui.components.BatchActionBar(
                        selectedCount = selectedFileIds.size,
                        onClearSelection = { selectedFileIds = emptySet() },
                        onBatchStar = { 
                            viewModel.batchStarFiles(selectedFileIds.toList())
                            selectedFileIds = emptySet()
                        },
                        onBatchMove = { isBatchMoving = true },
                        onBatchDelete = {
                            viewModel.batchDeleteFiles(selectedFileIds.toList())
                            selectedFileIds = emptySet()
                        }
                    )
                }
            }
        },
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface,
                tonalElevation = 0.dp
            ) {
                DashboardTab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = currentTab == tab,
                        onClick = { currentTab = tab },
                        icon = {
                            Icon(
                                imageVector = if (currentTab == tab) tab.selectedIcon else tab.icon,
                                contentDescription = tab.label
                            )
                        },
                        label = { Text(tab.label) }
                    )
                }
            }
        },
        floatingActionButton = {
            if (currentTab == DashboardTab.Home || currentTab == DashboardTab.Files) {
                FloatingActionButton(
                    onClick = { showUploadSheet = true },
                    containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
                    contentColor = MaterialTheme.colorScheme.primary,
                ) {
                    Icon(Icons.Default.Add, "Add", modifier = Modifier.size(28.dp))
                }
            }
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize()) {
            Box(modifier = Modifier.padding(top = padding.calculateTopPadding())) {
                UploadProgressSection(uploadStatus)
            }
            
            val screenPadding = PaddingValues(
                bottom = padding.calculateBottomPadding()
            )

            Surface(
                modifier = Modifier.fillMaxSize(),
                color = MaterialTheme.colorScheme.background,
                tonalElevation = 1.dp
            ) {
                PullToRefreshBox(
                    isRefreshing = isRefreshing,
                    onRefresh = { viewModel.refresh() },
                    modifier = Modifier.fillMaxSize()
                ) {
                    when (currentTab) {
                        DashboardTab.Home -> HomeScreen(
                            viewModel = viewModel,
                            files = filteredFiles,
                            onFileClick = { 
                                viewModel.onFileClick(it)
                                if (it.fileType == "Folder") viewModel.navigateToFolder(it)
                                else previewFile = it 
                            },
                            onShare = { shareFile = it },
                            onMoreClick = { selectedFileForAction = it },
                            contentPadding = screenPadding
                        )
                        DashboardTab.Favourites -> StarredScreen(
                            files = starredFiles, 
                            onFileClick = { 
                                viewModel.onFileClick(it)
                                if (it.fileType == "Folder") viewModel.navigateToFolder(it)
                                else previewFile = it 
                            },
                            onShare = { shareFile = it },
                            onMoreClick = { selectedFileForAction = it },
                            contentPadding = screenPadding
                        )
                        DashboardTab.Shared -> SharedScreen(
                            files = sharedFiles,
                            sentInvitations = sentInvitations,
                            receivedInvitations = receivedInvitations,
                            onFileClick = { 
                                viewModel.onFileClick(it)
                                if (it.fileType == "Folder") viewModel.navigateToFolder(it)
                                else previewFile = it 
                            },
                            onShare = { shareFile = it },
                            onMoreClick = { selectedFileForAction = it },
                            onRevokeInvite = { viewModel.revokeInvitation(it) },
                            onAcceptInvite = { viewModel.acceptInvitation(it) },
                            contentPadding = screenPadding
                        )
                        DashboardTab.Files -> DriveExplorerScreen(
                            viewModel = viewModel,
                            onFileClick = { 
                                if (selectedFileIds.isNotEmpty()) toggleSelection(it.fileId)
                                else if (it.fileType == "Folder") viewModel.navigateToFolder(it)
                                else previewFile = it 
                            },
                            onShare = { shareFile = it },
                            onMoreClick = { selectedFileForAction = it },
                            onToggleSelection = { toggleSelection(it) },
                            selectedFileIds = selectedFileIds,
                            contentPadding = screenPadding
                        )
                    }
                }
            }
        }
    }

    if (showProfileSheet) {
        ModalBottomSheet(
            onDismissRequest = { showProfileSheet = false },
            sheetState = profileSheetState,
            dragHandle = { BottomSheetDefaults.DragHandle() }
        ) {
            ProfileSheetContent(
                user = userMetadata,
                breakdown = storageBreakdown,
                isUpdating = isUpdating,
                onSignOut = {
                    showProfileSheet = false
                    onSignOutClick()
                },
                onTrashClick = {
                    showProfileSheet = false
                    showTrashScreen = true
                },
                onEditProfileClick = {
                    showProfileSheet = false
                    showEditProfileDialog = true
                },
                onStorageClick = {
                    showProfileSheet = false
                    showStorageAnalyticsSheet = true
                },
                onAvatarClick = {
                    onPickAvatarClick { name, type, size, data ->
                        storageViewModel.uploadAvatar(name, data)
                    }
                },
                onChangePasswordClick = {
                    showProfileSheet = false
                    showChangePasswordDialog = true
                },
                onToggleBiometric = { enabled ->
                    if (enabled) {
                        onBiometricAuthClick(
                            "Enable Biometric 2FA",
                            "Authenticate to secure your vault with biometrics",
                            {
                                storageViewModel.updatePreference("preferences.security.twoFactorEnabled", true)
                            },
                            { error ->
                                // Optional: show toast/snackbar
                            }
                        )
                    } else {
                        storageViewModel.updatePreference("preferences.security.twoFactorEnabled", false)
                    }
                },
                onUpdatePreference = { path, enabled ->
                    storageViewModel.updatePreference(path, enabled)
                },
                onDevicesClick = {
                    showProfileSheet = false
                    showDevicesSheet = true
                }
            )
        }
    }

    if (showDevicesSheet) {
        ModalBottomSheet(
            onDismissRequest = { showDevicesSheet = false },
            sheetState = devicesSheetState
        ) {
            DevicesSheetContent(
                devices = devices,
                onDisconnect = { viewModel.disconnectDevice(it) }
            )
        }
    }

    if (showActivitySheet) {
        ModalBottomSheet(
            onDismissRequest = { 
                showActivitySheet = false 
                viewModel.markActivitiesAsRead()
            },
            sheetState = activitySheetState
        ) {
            ActivitySheetContent(activities)
        }
    }

    if (shareFile != null) {
        ModalBottomSheet(
            onDismissRequest = { shareFile = null },
            sheetState = shareSheetState
        ) {
            ShareSheet(
                file = shareFile!!,
                onGenerateLink = { passcode, expiry ->
                    viewModel.generateShareLink(shareFile!!, passcode, expiry)
                    shareFile = null
                },
                onInviteUser = { email, phone, passcode, expiry ->
                    viewModel.inviteUser(shareFile!!, email, phone, passcode, expiry * 24)
                },
                onRemoveCollaborator = { collab ->
                    viewModel.removeCollaborator(shareFile!!, collab.email)
                },
                onDismiss = { shareFile = null }
            )
        }
    }

    if (showUploadSheet) {
        ModalBottomSheet(
            onDismissRequest = { showUploadSheet = false },
            sheetState = uploadSheetState
        ) {
            UploadOptionsContent(
                onUploadFile = {
                    showUploadSheet = false
                    onPickFileClick { name, type, size, data ->
                        viewModel.uploadFile(name, type, size, data)
                    }
                },
                onCreateFolder = { showUploadSheet = false },
                onScanDocument = {
                    showUploadSheet = false
                    onScanClick { name, type, size, data ->
                        viewModel.uploadFile(name, type, size, data)
                    }
                }
            )
        }
    }

    if (selectedFileForAction != null) {
        ModalBottomSheet(
            onDismissRequest = { selectedFileForAction = null },
            sheetState = actionSheetState
        ) {
            FileActionSheet(
                file = selectedFileForAction!!,
                onShare = {
                    shareFile = selectedFileForAction
                    selectedFileForAction = null
                },
                onStar = {
                    viewModel.toggleStar(selectedFileForAction!!)
                    selectedFileForAction = null
                },
                onRename = {
                    fileToRename = selectedFileForAction
                    selectedFileForAction = null
                },
                onMove = {
                    fileToMove = selectedFileForAction
                    selectedFileForAction = null
                },
                onCustomize = {
                    fileToCustomize = selectedFileForAction
                    selectedFileForAction = null
                },
                onDelete = {
                    viewModel.deleteFile(selectedFileForAction!!)
                    selectedFileForAction = null
                },
                onInfo = {
                    fileInfoToShow = selectedFileForAction
                    selectedFileForAction = null
                }
            )
        }
    }

    if (isBatchMoving) {
        ModalBottomSheet(
            onDismissRequest = { isBatchMoving = false },
            sheetState = moveSheetState
        ) {
            MoveToFolderSheet(
                folders = filteredFiles.filter { it.fileType == "Folder" && !selectedFileIds.contains(it.fileId) },
                onMoveTo = { targetId ->
                    scope.launch {
                        viewModel.batchMoveFiles(selectedFileIds.toList(), targetId)
                        selectedFileIds = emptySet()
                        isBatchMoving = false
                    }
                }
            )
        }
    }

    if (fileToMove != null) {
        ModalBottomSheet(
            onDismissRequest = { fileToMove = null },
            sheetState = moveSheetState
        ) {
            MoveToFolderSheet(
                folders = filteredFiles.filter { (it.fileType == "Folder") && (it.fileId != fileToMove?.fileId) },
                onMoveTo = { targetId ->
                    viewModel.moveFile(fileToMove!!, targetId)
                    fileToMove = null
                }
            )
        }
    }

    if (fileToCustomize != null) {
        ModalBottomSheet(
            onDismissRequest = { fileToCustomize = null },
            sheetState = customizeSheetState,
            containerColor = MaterialTheme.colorScheme.surface
        ) {
            FolderCustomizeSheet(
                folder = fileToCustomize!!,
                onSave = { color, icon ->
                    viewModel.customizeFolder(fileToCustomize!!.fileId, color, icon)
                    fileToCustomize = null
                },
                onDismiss = { fileToCustomize = null }
            )
        }
    }

    if (fileToRename != null) {
        var newName by remember { mutableStateOf(fileToRename!!.fileName) }
        AlertDialog(
            onDismissRequest = { fileToRename = null },
            title = { Text("Rename File") },
            text = {
                OutlinedTextField(
                    value = newName,
                    onValueChange = { newName = it },
                    label = { Text("New name") },
                    singleLine = true
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.renameFile(fileToRename!!, newName)
                        fileToRename = null
                    }
                ) {
                    Text("Rename")
                }
            },
            dismissButton = {
                TextButton(onClick = { fileToRename = null }) { Text("Cancel") }
            }
        )
    }

    if (fileInfoToShow != null) {
        AlertDialog(
            onDismissRequest = { fileInfoToShow = null },
            title = { Text("File Info") },
            text = {
                Column {
                    InfoRow("Name", fileInfoToShow!!.fileName)
                    InfoRow("Type", fileInfoToShow!!.fileType)
                    InfoRow("Size", "${fileInfoToShow!!.fileSize / 1024} KB")
                    InfoRow("Uploaded", fileInfoToShow!!.uploadTimestamp.toString())
                    InfoRow("ID", fileInfoToShow!!.fileId)
                }
            },
            confirmButton = {
                Button(onClick = { fileInfoToShow = null }) { Text("Close") }
            }
        )
    }

    if (showStorageAnalyticsSheet && userMetadata != null) {
        ModalBottomSheet(
            onDismissRequest = { showStorageAnalyticsSheet = false },
            sheetState = storageAnalyticsSheetState
        ) {
            com.cloud.x.app.shared.ui.components.StorageAnalyticsSheet(
                breakdown = storageBreakdown,
                totalUsed = userMetadata!!.storageUsed,
                totalAvailable = userMetadata!!.storageAvailable,
                planName = userMetadata!!.subscriptionPlan,
                onDismiss = { showStorageAnalyticsSheet = false },
                onCleanTrash = { 
                    showTrashScreen = true
                    showStorageAnalyticsSheet = false
                }
            )
        }
    }

    if (showEditProfileDialog) {
        var newName by remember(showEditProfileDialog) { mutableStateOf(userMetadata?.name ?: "") }
        var newPhone by remember(showEditProfileDialog) { mutableStateOf(userMetadata?.phoneNumber ?: "") }
        var newDOB by remember(showEditProfileDialog) { mutableStateOf(userMetadata?.dateOfBirth ?: "") }
        
        AlertDialog(
            onDismissRequest = { 
                if (!isUpdating) {
                    showEditProfileDialog = false 
                    editProfileError = null
                }
            },
            title = { Text("Edit Identity") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    if (editProfileError != null) {
                        Text(editProfileError!!, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.labelSmall)
                    }
                    OutlinedTextField(
                        value = newName,
                        onValueChange = { newName = it },
                        label = { Text("Full Name") },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !isUpdating,
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = newPhone,
                        onValueChange = { newPhone = it },
                        label = { Text("Phone Number") },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !isUpdating,
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = newDOB,
                        onValueChange = { newDOB = it },
                        label = { Text("Date of Birth (YYYY-MM-DD)") },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !isUpdating,
                        singleLine = true
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            val updates = mapOf(
                                "name" to newName,
                                "phoneNumber" to newPhone,
                                "dateOfBirth" to newDOB
                            )
                            storageViewModel.updateProfile(updates) { success ->
                                if (success) {
                                    showEditProfileDialog = false
                                    editProfileError = null
                                } else {
                                    editProfileError = "Failed to update profile. Please try again."
                                }
                            }
                        }
                    },
                    enabled = !isUpdating && newName.isNotEmpty()
                ) {
                    if (isUpdating) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                    } else {
                        Text("Save Protocol")
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { 
                        showEditProfileDialog = false 
                        editProfileError = null
                    },
                    enabled = !isUpdating
                ) { Text("Abort") }
            }
        )
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(modifier = Modifier.padding(vertical = 4.dp)) {
        Text("$label: ", fontWeight = FontWeight.Bold)
        Text(value)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DriveSearchBar(
    query: String,
    onQueryChange: (String) -> Unit,
    userMetadata: UserMetadata?,
    isDarkTheme: Boolean,
    unreadCount: Int = 0,
    isRefreshing: Boolean = false,
    onThemeToggle: () -> Unit,
    onNotificationClick: () -> Unit,
    onProfileClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp)
            .height(64.dp)
            .clip(RoundedCornerShape(32.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            .clickable { /* Focus search */ }
            .padding(horizontal = 16.dp),
        contentAlignment = Alignment.CenterStart
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxSize()
        ) {
            Icon(
                imageVector = Icons.Default.Search,
                contentDescription = "Search",
                modifier = Modifier.padding(8.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            BasicTextField(
                value = query,
                onValueChange = onQueryChange,
                modifier = Modifier.weight(1f).padding(horizontal = 8.dp),
                singleLine = true,
                textStyle = MaterialTheme.typography.bodyLarge.copy(color = MaterialTheme.colorScheme.onSurface),
                decorationBox = { innerTextField ->
                    Box(modifier = Modifier.fillMaxWidth()) {
                        if (query.isEmpty()) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    "Search in Drive",
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                if (isRefreshing) {
                                    val infiniteTransition = rememberInfiniteTransition()
                                    val pulseAlpha by infiniteTransition.animateFloat(
                                        initialValue = 0.4f,
                                        targetValue = 1f,
                                        animationSpec = infiniteRepeatable(
                                            animation = tween(800, easing = FastOutSlowInEasing),
                                            repeatMode = RepeatMode.Reverse
                                        )
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Box(
                                        modifier = Modifier
                                            .size(6.dp)
                                            .graphicsLayer { alpha = pulseAlpha }
                                            .clip(CircleShape)
                                            .background(MaterialTheme.colorScheme.primary)
                                    )
                                }
                            }
                        }
                        innerTextField()
                    }
                }
            )

            IconButton(onClick = onThemeToggle) {
                Icon(
                    imageVector = if (isDarkTheme) Icons.Default.LightMode else Icons.Default.DarkMode,
                    contentDescription = "Toggle Theme",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Box {
                IconButton(onClick = onNotificationClick) {
                    Icon(
                        imageVector = Icons.Outlined.Notifications,
                        contentDescription = "Notifications",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                if (unreadCount > 0) {
                    Badge(
                        modifier = Modifier.align(Alignment.TopEnd).padding(top = 8.dp, end = 8.dp),
                        containerColor = MaterialTheme.colorScheme.error,
                        contentColor = MaterialTheme.colorScheme.onError
                    ) {
                        Text(unreadCount.toString())
                    }
                }
            }

            Surface(
                modifier = Modifier
                    .padding(start = 8.dp)
                    .size(36.dp)
                    .clip(CircleShape)
                    .clickable { onProfileClick() },
                color = MaterialTheme.colorScheme.primaryContainer
            ) {
                userMetadata?.profilePictureUrl?.let { url ->
                    if (url.isNotEmpty()) {
                        AsyncImage(
                            model = url,
                            contentDescription = "Profile",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                    } else {
                        AvatarPlaceholder(userMetadata.name.ifEmpty { userMetadata.email })
                    }
                } ?: AvatarPlaceholder(userMetadata?.name ?: userMetadata?.email ?: "?")
            }
        }
    }
}

@Composable
fun HomeScreen(
    viewModel: DashboardViewModel,
    files: List<FileEntry>,
    onFileClick: (FileEntry) -> Unit,
    onShare: (FileEntry) -> Unit,
    onMoreClick: (FileEntry) -> Unit,
    contentPadding: PaddingValues = PaddingValues(0.dp)
) {
    val recentFiles = remember(files) {
        files.filter { it.fileType != "Folder" }
            .sortedByDescending { it.lastOpenedTimestamp?.seconds ?: it.uploadTimestamp.seconds }
            .take(5)
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = contentPadding
    ) {
        if (files.isEmpty() && viewModel.isRefreshing.value) {
            item {
                Text(
                    "Synchronizing Vault...",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                    color = MaterialTheme.colorScheme.primary
                )
            }
            items(6) {
                FileItemSkeleton(isGrid = false)
            }
        }

        if (recentFiles.isNotEmpty()) {
            item {
                Text(
                    "Recently Opened",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Black,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp)
                )
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
                ) {
                    items(recentFiles) { file ->
                        RecentFileCard(file, onClick = { onFileClick(file) })
                    }
                }
                
                HorizontalDivider(
                    modifier = Modifier.padding(horizontal = 20.dp),
                    color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
                )
                
                Text(
                    "All Files",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Black,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp)
                )
            }
        }

        items(files) { file ->
            FileListItem(
                file = file,
                onClick = { onFileClick(file) },
                onShare = { onShare(file) },
                onStar = { viewModel.toggleStar(file) },
                onOffline = { viewModel.toggleOffline(file) },
                onDelete = { onMoreClick(file) }
            )
        }
    }
}

@Composable
fun RecentFileCard(file: FileEntry, onClick: () -> Unit) {
    val isMedia = file.fileType.contains("Image", true) || file.fileType.contains("Video", true)
    
    Surface(
        onClick = onClick,
        modifier = Modifier.width(140.dp),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(80.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surfaceContainerHigh),
                contentAlignment = Alignment.Center
            ) {
                if (isMedia && file.downloadUrl.isNotEmpty()) {
                    AsyncImage(
                        model = file.downloadUrl,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    Icon(
                        imageVector = getFileIcon(file.fileType),
                        contentDescription = null,
                        modifier = Modifier.size(32.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                file.fileName,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                StorageQuotaManager.formatBytes(file.fileSize),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun ProfileSheetContent(
    user: UserMetadata?,
    breakdown: UserMetadata.StorageBreakdown,
    isUpdating: Boolean = false,
    onSignOut: () -> Unit,
    onTrashClick: () -> Unit,
    onEditProfileClick: () -> Unit = {},
    onAvatarClick: () -> Unit = {},
    onChangePasswordClick: () -> Unit = {},
    onDevicesClick: () -> Unit = {},
    onStorageClick: () -> Unit = {},
    onToggleBiometric: (Boolean) -> Unit = {},
    onUpdatePreference: (String, Any) -> Unit = { _, _ -> }
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(bottom = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        user?.let {
            Spacer(modifier = Modifier.height(24.dp))
            Box(
                modifier = Modifier
                    .size(84.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .clickable { onAvatarClick() },
                contentAlignment = Alignment.Center
            ) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.primaryContainer,
                    shadowElevation = 8.dp
                ) {
                    if (it.profilePictureUrl.isNotEmpty()) {
                        AsyncImage(
                            model = it.profilePictureUrl,
                            contentDescription = null,
                            contentScale = ContentScale.Crop
                        )
                    } else {
                        Box(contentAlignment = Alignment.Center) {
                            Text(it.name.firstOrNull()?.uppercase() ?: "?", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Black)
                        }
                    }
                }
                
                // Camera Overlay
                Surface(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(4.dp)
                        .size(24.dp),
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                    tonalElevation = 4.dp
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.CameraAlt, null, modifier = Modifier.size(14.dp))
                    }
                }
                
                if (isUpdating) {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = Color.Black.copy(alpha = 0.4f)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text(it.name.ifEmpty { "XCloud User" }, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
            Text(it.email, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)
            
            Row(modifier = Modifier.padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary
                ) {
                    Text(
                        "ID: ${it.displayId}", 
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Black,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                IconButton(
                    onClick = onEditProfileClick,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(Icons.Default.Edit, "Edit Profile", modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
                }
            }

            if (it.phoneNumber.isNotEmpty() || it.dateOfBirth.isNotEmpty()) {
                Row(
                    modifier = Modifier.padding(top = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (it.phoneNumber.isNotEmpty()) {
                        ProfileBadge(Icons.Default.Phone, it.phoneNumber)
                    }
                    if (it.dateOfBirth.isNotEmpty()) {
                        ProfileBadge(Icons.Default.CalendarToday, it.dateOfBirth)
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
            Box(modifier = Modifier.clickable { onStorageClick() }) {
                StorageBreakdownWidget(
                    breakdown = breakdown,
                    totalUsed = it.storageUsed,
                    totalAvailable = it.storageAvailable,
                    planName = it.subscriptionPlan
                )
            }
        }

        Spacer(modifier = Modifier.height(32.dp))
        HorizontalDivider(modifier = Modifier.padding(horizontal = 24.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
        
        user?.let {
            Text(
                "Interface Theme", 
                style = MaterialTheme.typography.labelLarge, 
                fontWeight = FontWeight.Black,
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp).align(Alignment.Start)
            )
            Row(
                modifier = Modifier.padding(horizontal = 24.dp).fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val currentTheme = it.preferences.theme
                listOf("light", "dark", "system").forEach { t ->
                    FilterChip(
                        selected = currentTheme == t,
                        onClick = { onUpdatePreference("preferences.theme", t) },
                        label = { Text(t.replaceFirstChar { it.uppercase() }) },
                        shape = RoundedCornerShape(12.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            ListItem(
                headlineContent = { Text("Hardware Nodes", fontWeight = FontWeight.Bold) },
                supportingContent = { Text("Manage authorized devices", style = MaterialTheme.typography.labelSmall) },
                leadingContent = { Icon(Icons.Default.Smartphone, null, tint = MaterialTheme.colorScheme.primary) },
                trailingContent = { Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = MaterialTheme.colorScheme.outline) },
                modifier = Modifier.clickable { onDevicesClick() }.padding(horizontal = 8.dp)
            )

            ListItem(
                headlineContent = { Text("Biometric 2FA", fontWeight = FontWeight.Bold) },
                supportingContent = { Text("Secure vault access with your fingerprint or face", style = MaterialTheme.typography.labelSmall) },
                leadingContent = { Icon(Icons.Default.Fingerprint, null, tint = MaterialTheme.colorScheme.primary) },
                trailingContent = {
                    Switch(
                        checked = it.preferences.security.twoFactorEnabled,
                        onCheckedChange = { enabled -> onToggleBiometric(enabled) }
                    )
                },
                modifier = Modifier.padding(horizontal = 8.dp)
            )

            ListItem(
                headlineContent = { Text("Access Alerts", fontWeight = FontWeight.Bold) },
                supportingContent = { Text("Notify on unauthorized access", style = MaterialTheme.typography.labelSmall) },
                leadingContent = { Icon(Icons.Default.Shield, null, tint = MaterialTheme.colorScheme.primary) },
                trailingContent = {
                    Switch(
                        checked = it.preferences.security.loginAlerts,
                        onCheckedChange = { enabled -> onUpdatePreference("preferences.security.loginAlerts", enabled) }
                    )
                },
                modifier = Modifier.padding(horizontal = 8.dp)
            )

            ListItem(
                headlineContent = { Text("Live Feedback", fontWeight = FontWeight.Bold) },
                supportingContent = { Text("Real-time interface notifications", style = MaterialTheme.typography.labelSmall) },
                leadingContent = { Icon(Icons.Default.NotificationsActive, null, tint = MaterialTheme.colorScheme.primary) },
                trailingContent = {
                    Switch(
                        checked = it.preferences.notifications.pushToasts,
                        onCheckedChange = { enabled -> onUpdatePreference("preferences.notifications.pushToasts", enabled) }
                    )
                },
                modifier = Modifier.padding(horizontal = 8.dp)
            )
        }

        ListItem(
            headlineContent = { Text("Trash Bin", fontWeight = FontWeight.Bold) },
            leadingContent = { Icon(Icons.Default.Delete, null, tint = MaterialTheme.colorScheme.error) },
            modifier = Modifier.clickable { onTrashClick() }.padding(horizontal = 8.dp)
        )

        Spacer(modifier = Modifier.height(16.dp))
        
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Button(
                onClick = onSignOut,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(Icons.AutoMirrored.Filled.Logout, null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Sign Out")
            }
        }

        HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp, horizontal = 24.dp), color = MaterialTheme.colorScheme.error.copy(alpha = 0.1f))
        
        ListItem(
            headlineContent = { Text("Decommission Vault", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold) },
            supportingContent = { Text("Permanent account termination", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.error.copy(alpha = 0.7f)) },
            leadingContent = { Icon(Icons.Default.Dangerous, null, tint = MaterialTheme.colorScheme.error) },
            modifier = Modifier.clickable { 
                // Protocol for termination would go here
            }.padding(horizontal = 8.dp)
        )
    }
}

@Composable
fun ProfileBadge(icon: ImageVector, text: String) {
    Surface(
        shape = CircleShape,
        color = MaterialTheme.colorScheme.surfaceVariant,
        contentColor = MaterialTheme.colorScheme.onSurfaceVariant
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Icon(icon, null, modifier = Modifier.size(12.dp))
            Text(text, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
        }
    }
}


@Composable
fun UploadOptionsContent(
    onUploadFile: () -> Unit,
    onCreateFolder: () -> Unit,
    onScanDocument: () -> Unit
) {
    Column(modifier = Modifier.padding(bottom = 32.dp, start = 16.dp, end = 16.dp)) {
        Text("Create New", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(vertical = 16.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            UploadOptionItem(Icons.Default.CreateNewFolder, "Folder", onCreateFolder)
            UploadOptionItem(Icons.Default.UploadFile, "Upload", onUploadFile)
            UploadOptionItem(Icons.Default.DocumentScanner, "Scan", onScanDocument)
        }
    }
}

@Composable
fun UploadOptionItem(icon: ImageVector, label: String, onClick: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable { onClick() }.padding(8.dp)
    ) {
        Surface(
            shape = CircleShape,
            color = MaterialTheme.colorScheme.surfaceVariant,
            modifier = Modifier.size(56.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(icon, contentDescription = label)
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(label, style = MaterialTheme.typography.labelMedium)
    }
}

@Composable
fun AvatarPlaceholder(text: String) {
    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
        Text(
            text = text.firstOrNull()?.toString()?.uppercase() ?: "?",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onPrimaryContainer
        )
    }
}

@Composable
fun DevicesSheetContent(
    devices: List<UserDevice>,
    onDisconnect: (UserDevice) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 32.dp)
    ) {
        Text(
            "Authorized Hardware Nodes",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Black,
            modifier = Modifier.padding(24.dp)
        )

        if (devices.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxWidth().height(200.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.Devices, null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.outline)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("No other nodes detected", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        } else {
            LazyColumn(modifier = Modifier.fillMaxWidth()) {
                items(devices) { device ->
                    ListItem(
                        headlineContent = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(device.name, fontWeight = FontWeight.Bold)
                                if (device.isCurrent) {
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Surface(
                                        color = Color(0xFF4CAF50),
                                        shape = RoundedCornerShape(4.dp)
                                    ) {
                                        Text(
                                            "ACTIVE NOW",
                                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
                                            style = MaterialTheme.typography.labelSmall,
                                            color = Color.White,
                                            fontWeight = FontWeight.Black
                                        )
                                    }
                                }
                            }
                        },
                        supportingContent = {
                            Column {
                                Text("${device.type} • ${device.location}")
                                Text("IP: ${device.ip}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                            }
                        },
                        leadingContent = {
                            val icon = when (device.type.lowercase()) {
                                "web", "browser" -> Icons.Default.Monitor
                                "android", "ios", "smartphone" -> Icons.Default.Smartphone
                                else -> Icons.Default.Devices
                            }
                            Surface(
                                modifier = Modifier.size(40.dp),
                                shape = RoundedCornerShape(12.dp),
                                color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(icon, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                                }
                            }
                        },
                        trailingContent = {
                            if (!device.isCurrent) {
                                TextButton(onClick = { onDisconnect(device) }) {
                                    Text("Disconnect", color = MaterialTheme.colorScheme.error)
                                }
                            }
                        }
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        Card(
            modifier = Modifier.padding(horizontal = 24.dp).fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f))
        ) {
            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.DeveloperBoard, null, tint = MaterialTheme.colorScheme.primary)
                Spacer(modifier = Modifier.width(16.dp))
                Text(
                    "XCloud uses hardware-bound identity. Remote decommissioning terminates all access nodes instantly.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
        }
    }
}

@Composable
fun UploadProgressSection(status: FileUploadManager.UploadStatus?) {
    when (status) {
        is FileUploadManager.UploadStatus.Progress -> {
            val progress = status.percentage
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier.fillMaxWidth().height(2.dp),
                color = MaterialTheme.colorScheme.primary,
                trackColor = Color.Transparent
            )
        }
        is FileUploadManager.UploadStatus.Error -> {
            Card(
                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
            ) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Error, null, tint = MaterialTheme.colorScheme.error)
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        status.message,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onErrorContainer
                    )
                }
            }
        }
        is FileUploadManager.UploadStatus.Success -> {
            // Optional: show a temporary success message
        }
        null -> {}
    }
}

@Composable
fun ActivitySheetContent(activities: List<UserActivity>) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 32.dp)
    ) {
        Text(
            "Recent Activity",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Black,
            modifier = Modifier.padding(24.dp)
        )

        if (activities.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxWidth().height(200.dp),
                contentAlignment = Alignment.Center
            ) {
                Text("No recent activity", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            LazyColumn(modifier = Modifier.fillMaxWidth()) {
                items(activities) { activity ->
                    ListItem(
                        headlineContent = { 
                            Text(
                                activity.fileName ?: activity.type,
                                fontWeight = FontWeight.Bold
                            ) 
                        },
                        supportingContent = { 
                            Column {
                                Text(activity.details)
                                Text(
                                    "Recently", 
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.outline
                                )
                            }
                        },
                        leadingContent = {
                            val (icon, color) = when (activity.type) {
                                "UPLOAD" -> Icons.Default.CheckCircle to Color(0xFF4CAF50)
                                "DELETE" -> Icons.Default.Delete to Color(0xFFF44336)
                                "SHARE" -> Icons.Default.Person to Color(0xFF2196F3)
                                "RESTORE" -> Icons.Default.Restore to Color(0xFF9C27B0)
                                else -> Icons.Default.Info to Color.Gray
                            }
                            Surface(
                                modifier = Modifier.size(40.dp),
                                shape = RoundedCornerShape(12.dp),
                                color = color.copy(alpha = 0.1f)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(icon, null, tint = color, modifier = Modifier.size(20.dp))
                                }
                            }
                        },
                        trailingContent = {
                            if (!activity.isRead) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .background(MaterialTheme.colorScheme.primary, CircleShape)
                                )
                            }
                        }
                    )
                }
            }
        }
    }
}
