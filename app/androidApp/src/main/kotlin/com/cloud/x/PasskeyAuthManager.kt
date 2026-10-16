package com.cloud.x

import android.content.Context
import android.util.Log
import androidx.credentials.CredentialManager
import androidx.credentials.CreatePublicKeyCredentialRequest
import androidx.credentials.CreatePublicKeyCredentialResponse
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetPublicKeyCredentialOption
import androidx.credentials.PublicKeyCredential
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class PasskeyAuthManager(private val context: Context) {
    private val credentialManager = CredentialManager.create(context)
    private val firebaseAuth = FirebaseAuth.getInstance()

    suspend fun createPasskey(activityContext: Context, requestJson: String): Boolean {
        return try {
            val request = CreatePublicKeyCredentialRequest(requestJson)
            val result = credentialManager.createCredential(activityContext, request)
            if (result is CreatePublicKeyCredentialResponse) {
                Log.d("PasskeyAuth", "Passkey created successfully: ${result.registrationResponseJson}")
                // Send registrationResponseJson to backend API
                true
            } else {
                false
            }
        } catch (e: Exception) {
            Log.e("PasskeyAuth", "Passkey creation failed", e)
            false
        }
    }

    suspend fun signInWithPasskey(activityContext: Context, requestJson: String): Boolean {
        return try {
            val publicKeyCredentialOption = GetPublicKeyCredentialOption(requestJson)
            val request = GetCredentialRequest(listOf(publicKeyCredentialOption))
            
            val result = credentialManager.getCredential(activityContext, request)
            val credential = result.credential
            
            if (credential is PublicKeyCredential) {
                val authenticationResponseJson = credential.authenticationResponseJson
                Log.d("PasskeyAuth", "Passkey assertion received: $authenticationResponseJson")
                // Verify assertion on backend and sign in with custom token
                true
            } else {
                false
            }
        } catch (e: Exception) {
            Log.e("PasskeyAuth", "Passkey sign-in failed", e)
            false
        }
    }
}
