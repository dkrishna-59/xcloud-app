package com.cloud.x.app.shared.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.cloud.x.model.UserMetadata
import com.cloud.x.util.StorageQuotaManager

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StorageAnalyticsSheet(
    breakdown: UserMetadata.StorageBreakdown,
    totalUsed: Long,
    totalAvailable: Long,
    planName: String,
    onDismiss: () -> Unit,
    onCleanTrash: () -> Unit
) {
    val usedPercentage = if (totalAvailable > 0) totalUsed.toFloat() / totalAvailable else 0f
    
    val categories = listOf(
        CategoryData("Images & Photos", breakdown.images, Color(0xFF2196F3), Icons.Default.Image),
        CategoryData("Videos & Media", breakdown.videos, Color(0xFF9C27B0), Icons.Default.Movie),
        CategoryData("Documents & PDFs", breakdown.documents, Color(0xFF4CAF50), Icons.Default.Description),
        CategoryData("Audio & Music", breakdown.audio, Color(0xFFFF9800), Icons.Default.MusicNote),
        CategoryData("Other Archives", breakdown.others, Color(0xFF9E9E9E), Icons.Default.MoreHoriz)
    )

    Column(modifier = Modifier.fillMaxWidth().padding(bottom = 24.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                color = MaterialTheme.colorScheme.primaryContainer,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.size(48.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Analytics, null, tint = MaterialTheme.colorScheme.primary)
                }
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text("Storage Analytics", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                Text("Detailed vault allocation", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            IconButton(onClick = onDismiss) {
                Icon(Icons.Default.Close, null)
            }
        }

        LazyColumn(
            modifier = Modifier.fillMaxWidth(),
            contentPadding = PaddingValues(horizontal = 24.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            item {
                Surface(
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    shape = RoundedCornerShape(24.dp)
                ) {
                    Column(modifier = Modifier.padding(24.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Bottom) {
                            Column {
                                Text(
                                    StorageQuotaManager.formatBytes(totalUsed),
                                    style = MaterialTheme.typography.headlineMedium,
                                    fontWeight = FontWeight.Black
                                )
                                Text(
                                    "Utilized out of ${StorageQuotaManager.formatBytes(totalAvailable)}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Text(
                                "${(usedPercentage * 100).toInt()}%",
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Black,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }

                        Spacer(modifier = Modifier.height(24.dp))

                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(12.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f))
                        ) {
                            Row(modifier = Modifier.fillMaxSize()) {
                                if (totalUsed > 0) {
                                    categories.forEach { cat ->
                                        if (cat.size > 0) {
                                            Box(
                                                modifier = Modifier
                                                    .weight(cat.size.toFloat().coerceAtLeast(1f))
                                                    .fillMaxHeight()
                                                    .background(cat.color)
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Plan: ${planName.uppercase()}", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.VerifiedUser, null, modifier = Modifier.size(14.dp), tint = Color(0xFF4CAF50))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Zero-Knowledge", style = MaterialTheme.typography.labelSmall, color = Color(0xFF4CAF50))
                            }
                        }
                    }
                }
            }

            item {
                Text("CATEGORY BREAKDOWN", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.outline)
                Spacer(modifier = Modifier.height(8.dp))
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    categories.forEach { cat ->
                        Surface(
                            color = MaterialTheme.colorScheme.surfaceContainer,
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Surface(
                                    color = cat.color.copy(alpha = 0.2f),
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier.size(40.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(cat.icon, null, tint = cat.color, modifier = Modifier.size(20.dp))
                                    }
                                }
                                Spacer(modifier = Modifier.width(16.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(cat.name, fontWeight = FontWeight.Bold)
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(StorageQuotaManager.formatBytes(cat.size), fontWeight = FontWeight.Black)
                                    val pct = if (totalUsed > 0) ((cat.size.toFloat() / totalUsed) * 100).toInt() else 0
                                    Text("$pct%", style = MaterialTheme.typography.labelSmall, color = cat.color)
                                }
                            }
                        }
                    }
                }
            }

            item {
                Surface(
                    color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f),
                    shape = RoundedCornerShape(20.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.2f))
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            color = MaterialTheme.colorScheme.primaryContainer,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.size(40.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.AutoAwesome, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                            }
                        }
                        Spacer(modifier = Modifier.width(16.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Smart Optimization", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelLarge)
                            Text("Empty trash to reclaim space", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Button(onClick = { onCleanTrash(); onDismiss() }, shape = RoundedCornerShape(12.dp)) {
                            Text("Clean")
                        }
                    }
                }
            }
        }
    }
}

data class CategoryData(val name: String, val size: Long, val color: Color, val icon: ImageVector)
