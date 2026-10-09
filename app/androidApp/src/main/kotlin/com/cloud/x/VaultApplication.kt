package com.cloud.x

import android.app.Application
import android.util.Log
import com.facebook.appevents.AppEventsLogger
import coil3.ImageLoader
import coil3.PlatformContext
import coil3.SingletonImageLoader
import coil3.video.VideoFrameDecoder
import com.google.firebase.FirebaseApp

class VaultApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        try {
            // Initialize Firebase App explicitly
            FirebaseApp.initializeApp(this)

            // Initialize Facebook SDK
            AppEventsLogger.activateApp(this)
            
            // Initialize Coil with Video Frame Decoder
            SingletonImageLoader.setSafe { context: PlatformContext ->
                ImageLoader.Builder(context)
                    .components {
                        add(VideoFrameDecoder.Factory())
                    }
                    .build()
            }
            
            Log.d("VaultApplication", "Application initialized successfully")
        } catch (e: Throwable) {
            Log.e("VaultApplication", "Failed to initialize application", e)
        }
    }
}
