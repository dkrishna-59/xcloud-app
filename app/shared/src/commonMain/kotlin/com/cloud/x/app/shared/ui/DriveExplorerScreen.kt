package com.cloud.x.app.shared.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import com.cloud.x.app.shared.viewmodel.DashboardViewModel
import com.cloud.x.model.FileEntry

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun DriveExplorerScreen(
    viewModel: DashboardViewModel,
    onFileClick: (FileEntry) -> Unit,
    onShare: (FileEntry) -> Unit = {},
    onMoreClick: (FileEntry) -> Unit = {},
    onToggleSelection: (String) -> Unit = {},
    selectedFileIds: Set<String> = emptySet(),
    contentPadding: PaddingValues = PaddingValues(0.dp)
) {
    val filteredFiles by viewModel.filteredFiles.collectAsState()
    val breadcrumbs by viewModel.breadcrumbs.collectAsState()
    var isGridView by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize()) {
        // Breadcrumbs & View Toggle
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            FlowRow(
                modifier = Modifier.weight(1f),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                breadcrumbs.forEachIndexed { index, crumb ->
                    if (index > 0) {
                        Icon(
                            Icons.Default.ChevronRight,
                            null,
                            modifier = Modifier.size(14.dp).align(Alignment.CenterVertically),
                            tint = MaterialTheme.colorScheme.outline
                        )
                    }
                    Text(
                        text = crumb.name,
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = if (index == breadcrumbs.size - 1) FontWeight.Black else FontWeight.Medium,
                        color = if (index == breadcrumbs.size - 1) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { viewModel.navigateToBreadcrumb(index) }
                            .padding(horizontal = 4.dp, vertical = 2.dp)
                    )
                }
            }
            
            IconButton(onClick = { isGridView = !isGridView }) {
                Icon(if (isGridView) Icons.Default.List else Icons.Default.GridView, null)
            }
        }

        if (isGridView) {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 120.dp),
                contentPadding = contentPadding,
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.padding(horizontal = 16.dp)
            ) {
                items(filteredFiles) { file ->
                    FileGridItem(
                        file = file, 
                        onClick = { 
                            if (selectedFileIds.isNotEmpty()) onToggleSelection(file.fileId) 
                            else onFileClick(file) 
                        },
                        onLongClick = { onToggleSelection(file.fileId) },
                        isSelected = selectedFileIds.contains(file.fileId)
                    )
                }
            }
        } else {
            LazyColumn(
                contentPadding = contentPadding
            ) {
                items(filteredFiles) { file ->
                    FileListItem(
                        file = file,
                        onClick = { 
                            if (selectedFileIds.isNotEmpty()) onToggleSelection(file.fileId) 
                            else onFileClick(file) 
                        },
                        onLongClick = { onToggleSelection(file.fileId) },
                        isSelected = selectedFileIds.contains(file.fileId),
                        onShare = { onShare(file) },
                        onStar = { viewModel.toggleStar(file) },
                        onOffline = { viewModel.toggleOffline(file) },
                        onDelete = { onMoreClick(file) }
                    )
                }
            }
        }
    }
}

@OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)
@Composable
fun FileGridItem(
    file: FileEntry, 
    onClick: () -> Unit,
    onLongClick: (() -> Unit)? = null,
    isSelected: Boolean = false
) {
    val activeColor = com.cloud.x.app.shared.ui.components.FOLDER_COLORS.find { it.first == file.folderColor }?.second ?: Color(0xFFFFB300)
    val activeIcon = com.cloud.x.app.shared.ui.components.FOLDER_ICONS.find { it.first == file.folderIcon }?.second ?: Icons.Default.Folder

    Card(
        modifier = Modifier.size(120.dp).combinedClickable(
            onClick = onClick,
            onLongClick = onLongClick
        ),
        colors = CardDefaults.cardColors(containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceContainer),
        border = if (isSelected) androidx.compose.foundation.BorderStroke(2.dp, MaterialTheme.colorScheme.primary) else null
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            Column(
                modifier = Modifier.fillMaxSize().padding(8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(
                    imageVector = if (file.fileType == "Folder") activeIcon else getFileIcon(file.fileType),
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = if (file.fileType == "Folder") activeColor else MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    file.fileName,
                    style = MaterialTheme.typography.bodySmall,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            if (isSelected) {
                Icon(
                    Icons.Default.CheckCircle,
                    contentDescription = "Selected",
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(8.dp)
                        .size(20.dp)
                        .background(MaterialTheme.colorScheme.surface, CircleShape)
                )
            }
        }
    }
}
