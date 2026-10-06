plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.androidMultiplatformLibrary)
    alias(libs.plugins.kotlinxSerialization)
}

kotlin {

    androidLibrary {
        namespace = "com.cloud.x.core"
        compileSdk = libs.versions.android.compileSdk.get().toInt()
        minSdk = libs.versions.android.minSdk.get().toInt()
    }
    jvm()
    js {
        browser()
    }
    iosArm64()
    iosSimulatorArm64()

    
    sourceSets {
        androidMain.dependencies {
            implementation(project.dependencies.platform(libs.firebase.bom))
            implementation(libs.ktor.client.okhttp)
        }
        commonMain.dependencies {
            api(libs.firebase.auth)
            api(libs.firebase.firestore)
            api(libs.firebase.storage)
            implementation("io.github.jan-tennert.supabase:storage-kt:3.1.1")
            implementation("io.github.jan-tennert.supabase:postgrest-kt:3.1.1")
            implementation("io.ktor:ktor-client-core:3.0.1")
            implementation(libs.kotlinx.serialization.json)
            implementation(libs.kotlinx.coroutines.core)
            api(libs.kotlinx.datetime)
        }
    }
}

// DO NOT USE android { } block if it's unresolved.
// Set namespace in AndroidManifest.xml if necessary.
