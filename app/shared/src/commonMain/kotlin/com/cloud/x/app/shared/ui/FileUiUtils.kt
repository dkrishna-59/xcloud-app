package com.cloud.x.app.shared.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.background
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.cloud.x.model.FileEntry
import com.cloud.x.util.StorageQuotaManager

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun FileListItem(
    file: FileEntry,
    onClick: () -> Unit,
    onLongClick: (() -> Unit)? = null,
    isSelected: Boolean = false,
    onShare: () -> Unit = {},
    onStar: () -> Unit = {},
    onOffline: () -> Unit = {},
    onDelete: () -> Unit = {},
    isSharedView: Boolean = false
) {
    var showMenu by remember { mutableStateOf(false) }
    val isMedia = file.fileType.contains("Image", true) || file.fileType.contains("Video", true)
    
    val activeColor = com.cloud.x.app.shared.ui.components.FOLDER_COLORS.find { it.first == file.folderColor }?.second ?: Color(0xFFFFB300)
    val activeIcon = com.cloud.x.app.shared.ui.components.FOLDER_ICONS.find { it.first == file.folderIcon }?.second ?: Icons.Default.Folder

    ListItem(
        modifier = Modifier
            .fillMaxWidth()
            .combinedClickable(
                onClick = onClick,
                onLongClick = onLongClick
            ).background(if (isSelected) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f) else Color.Transparent),
        headlineContent = { 
            Text(
                file.fileName, 
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            ) 
        },
        supportingContent = { 
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    val sizeText = if (file.fileType == "Folder") {
                        if (file.fileSize == 0L) "Empty" else StorageQuotaManager.formatBytes(file.fileSize)
                    } else {
                        StorageQuotaManager.formatBytes(file.fileSize)
                    }
                    Text(
                        "${file.fileType} • $sizeText",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    if (file.isStarred) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Icon(
                            Icons.Default.Star, 
                            null, 
                            modifier = Modifier.size(14.dp), 
                            tint = Color(0xFFFFB300) // Star Gold
                        )
                    }
                    if (file.isOffline) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Icon(
                            Icons.Default.DownloadDone, 
                            null, 
                            modifier = Modifier.size(14.dp), 
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                }
                if (isSharedView && file.ownerId.isNotEmpty()) {
                    Text(
                        "Shared by: ${file.ownerId.take(8)}...", // In a real app, this would be a resolved name/email
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }
            }
        },
        leadingContent = {
            Box {
                Surface(
                    modifier = Modifier.size(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    color = if (file.fileType == "Folder") activeColor.copy(alpha = 0.2f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        if (isMedia && file.downloadUrl.isNotEmpty()) {
                            AsyncImage(
                                model = file.downloadUrl,
                                contentDescription = null,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                        } else {
                            Icon(
                                imageVector = if (file.fileType == "Folder") activeIcon else getFileIcon(file.fileType),
                                contentDescription = null,
                                tint = if (file.fileType == "Folder") activeColor else MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }
                }
                if (isSelected) {
                    Icon(
                        Icons.Default.CheckCircle,
                        contentDescription = "Selected",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.align(Alignment.BottomEnd).size(20.dp).background(MaterialTheme.colorScheme.surface, CircleShape)
                    )
                }
            }
        },
        trailingContent = {
            Box {
                IconButton(onClick = { showMenu = true }) {
                    Icon(Icons.Default.MoreVert, "Menu")
                }
                DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                    DropdownMenuItem(
                        text = { Text(if (file.isStarred) "Unstar" else "Star") },
                        leadingIcon = { Icon(if (file.isStarred) Icons.Default.Star else Icons.Default.StarBorder, null) },
                        onClick = { showMenu = false; onStar() }
                    )
                    DropdownMenuItem(
                        text = { Text("Share") },
                        leadingIcon = { Icon(Icons.Default.Share, null) },
                        onClick = { showMenu = false; onShare() }
                    )
                    DropdownMenuItem(
                        text = { Text(if (file.isOffline) "Remove Offline" else "Make Offline") },
                        leadingIcon = { Icon(if (file.isOffline) Icons.Default.CloudDone else Icons.Default.CloudDownload, null) },
                        onClick = { showMenu = false; onOffline() }
                    )
                    HorizontalDivider()
                    DropdownMenuItem(
                        text = { Text("Delete") },
                        leadingIcon = { Icon(Icons.Default.Delete, null) },
                        onClick = { showMenu = false; onDelete() }
                    )
                }
            }
        }
    )
}

fun getFileIcon(type: String) = when {
    type == "Folder" -> Icons.Default.Folder
    type.contains("Image", true) -> Icons.Default.Image
    type.contains("Video", true) -> Icons.Default.VideoLibrary
    type.contains("Audio", true) -> Icons.Default.AudioFile
    type.contains("Text", true) -> Icons.Default.Description
    type.contains("ZIP", true) -> Icons.Default.FolderZip
    else -> Icons.Default.InsertDriveFile
}
