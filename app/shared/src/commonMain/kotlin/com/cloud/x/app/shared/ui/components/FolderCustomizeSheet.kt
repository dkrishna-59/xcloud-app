package com.cloud.x.app.shared.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.cloud.x.model.FileEntry

val FOLDER_COLORS = listOf(
    Pair("amber", Color(0xFFFFB300)),
    Pair("blue", Color(0xFF2196F3)),
    Pair("indigo", Color(0xFF3F51B5)),
    Pair("emerald", Color(0xFF4CAF50)),
    Pair("purple", Color(0xFF9C27B0)),
    Pair("rose", Color(0xFFE91E63)),
    Pair("gray", Color(0xFF9E9E9E))
)

val FOLDER_ICONS = listOf(
    Pair("folder", Icons.Default.Folder),
    Pair("briefcase", Icons.Default.Work),
    Pair("star", Icons.Default.Star),
    Pair("heart", Icons.Default.Favorite),
    Pair("archive", Icons.Default.Archive),
    Pair("code", Icons.Default.Code)
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FolderCustomizeSheet(
    folder: FileEntry,
    onSave: (color: String, icon: String) -> Unit,
    onDismiss: () -> Unit
) {
    var selectedColor by remember { mutableStateOf(folder.folderColor ?: "amber") }
    var selectedIcon by remember { mutableStateOf(folder.folderIcon ?: "folder") }

    val activeColorVal = FOLDER_COLORS.find { it.first == selectedColor }?.second ?: Color(0xFFFFB300)
    val activeIconVal = FOLDER_ICONS.find { it.first == selectedIcon }?.second ?: Icons.Default.Folder

    Column(modifier = Modifier.padding(24.dp).padding(bottom = 32.dp).fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 24.dp)) {
            Surface(
                color = activeColorVal.copy(alpha = 0.2f),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.size(48.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(activeIconVal, null, tint = activeColorVal)
                }
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text("Customize Folder", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                Text(folder.fileName, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        Text("Select Color", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
        Spacer(modifier = Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            FOLDER_COLORS.forEach { (colorName, colorVal) ->
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(colorVal)
                        .border(
                            width = if (selectedColor == colorName) 3.dp else 0.dp,
                            color = if (selectedColor == colorName) MaterialTheme.colorScheme.onSurface else Color.Transparent,
                            shape = CircleShape
                        )
                        .clickable { selectedColor = colorName },
                    contentAlignment = Alignment.Center
                ) {
                    if (selectedColor == colorName) {
                        Icon(Icons.Default.Check, null, tint = MaterialTheme.colorScheme.surface, modifier = Modifier.size(20.dp))
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text("Select Icon", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
        Spacer(modifier = Modifier.height(12.dp))
        LazyVerticalGrid(
            columns = GridCells.Fixed(4),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.height(100.dp)
        ) {
            items(FOLDER_ICONS) { (iconName, iconVector) ->
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (selectedIcon == iconName) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.size(48.dp).clickable { selectedIcon = iconName }
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = iconVector,
                            contentDescription = null,
                            tint = if (selectedIcon == iconName) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        Button(
            onClick = { onSave(selectedColor, selectedIcon); onDismiss() },
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(16.dp)
        ) {
            Text("Save Customization", fontWeight = FontWeight.Bold)
        }
    }
}
