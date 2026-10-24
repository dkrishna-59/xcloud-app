package com.cloud.x.app.shared.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.DriveFileMove
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun BatchActionBar(
    selectedCount: Int,
    onClearSelection: () -> Unit,
    onBatchStar: () -> Unit,
    onBatchMove: () -> Unit,
    onBatchDelete: () -> Unit
) {
    AnimatedVisibility(
        visible = selectedCount > 0,
        enter = slideInVertically(initialOffsetY = { it }),
        exit = slideOutVertically(targetOffsetY = { it }),
        modifier = Modifier.fillMaxWidth().padding(16.dp)
    ) {
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.secondaryContainer,
            shadowElevation = 8.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp).fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onClearSelection) {
                        Icon(Icons.Default.Close, "Clear Selection", tint = MaterialTheme.colorScheme.onSecondaryContainer)
                    }
                    Text(
                        "$selectedCount Selected",
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSecondaryContainer
                    )
                }

                Row {
                    IconButton(onClick = onBatchStar) {
                        Icon(Icons.Default.Star, "Star items", tint = MaterialTheme.colorScheme.onSecondaryContainer)
                    }
                    IconButton(onClick = onBatchMove) {
                        Icon(Icons.AutoMirrored.Filled.DriveFileMove, "Move items", tint = MaterialTheme.colorScheme.onSecondaryContainer)
                    }
                    IconButton(onClick = onBatchDelete) {
                        Icon(Icons.Default.Delete, "Delete items", tint = MaterialTheme.colorScheme.error)
                    }
                }
            }
        }
    }
}
