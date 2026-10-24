package com.cloud.x.app.shared.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.DriveFileMove
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.cloud.x.model.FileEntry
import com.cloud.x.util.StorageQuotaManager

@Composable
fun FileActionSheet(
    file: FileEntry,
    onShare: () -> Unit,
    onStar: () -> Unit,
    onRename: () -> Unit,
    onMove: () -> Unit,
    onCustomize: (() -> Unit)? = null,
    onDelete: () -> Unit,
    onInfo: () -> Unit
) {
    Column(modifier = Modifier.padding(bottom = 32.dp).fillMaxWidth()) {
        ListItem(
            headlineContent = { Text(file.fileName, fontWeight = FontWeight.Bold) },
            supportingContent = { Text("${file.fileType} • ${StorageQuotaManager.formatBytes(file.fileSize)}") },
            leadingContent = {
                Surface(
                    modifier = Modifier.size(48.dp),
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = getFileIcon(file.fileType),
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
        )
        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
        
        ActionItem(
            text = if (file.isStarred) "Remove Favourited" else "Add to Favourites",
            icon = if (file.isStarred) Icons.Default.Star else Icons.Default.StarBorder,
            onClick = onStar
        )
        ActionItem(
            text = "Share Access",
            icon = Icons.Default.Share,
            onClick = onShare
        )
        ActionItem(
            text = "Relocate File",
            icon = Icons.AutoMirrored.Filled.DriveFileMove,
            onClick = onMove
        )
        if (file.fileType == "Folder" && onCustomize != null) {
            ActionItem(
                text = "Customize Folder",
                icon = Icons.Default.Palette,
                onClick = onCustomize
            )
        }
        ActionItem(
            text = "Rename Key",
            icon = Icons.Default.Edit,
            onClick = onRename
        )
        ActionItem(
            text = "Protocol Info",
            icon = Icons.Default.Info,
            onClick = onInfo
        )
        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
        ActionItem(
            text = "Decommission (Trash)",
            icon = Icons.Default.Delete,
            onClick = onDelete,
            color = MaterialTheme.colorScheme.error
        )
    }
}

@Composable
fun MoveToFolderSheet(
    folders: List<FileEntry>,
    onMoveTo: (String) -> Unit
) {
    Column(modifier = Modifier.padding(bottom = 32.dp).fillMaxWidth()) {
        Text(
            "Relocate to Folder",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Black,
            modifier = Modifier.padding(24.dp)
        )
        
        LazyColumn(modifier = Modifier.fillMaxWidth()) {
            item {
                ListItem(
                    headlineContent = { Text("Base Vault (Root)", fontWeight = FontWeight.Bold) },
                    leadingContent = { Icon(Icons.Default.Home, null, tint = MaterialTheme.colorScheme.primary) },
                    modifier = Modifier.clickable { onMoveTo("root") }
                )
            }
            items(folders) { folder ->
                ListItem(
                    headlineContent = { Text(folder.fileName) },
                    leadingContent = { Icon(Icons.Default.Folder, null, tint = Color(0xFFFFB300)) },
                    modifier = Modifier.clickable { onMoveTo(folder.fileId) }
                )
            }
        }
    }
}

@Composable
private fun ActionItem(
    text: String, 
    icon: ImageVector, 
    onClick: () -> Unit,
    color: Color = MaterialTheme.colorScheme.onSurface
) {
    ListItem(
        headlineContent = { Text(text, color = color, fontWeight = FontWeight.Medium) },
        leadingContent = { Icon(icon, null, tint = color.copy(alpha = 0.7f)) },
        modifier = Modifier.clickable { onClick() }
    )
}
