import { createHoppApp } from "@hoppscotch/common"

createHoppApp("#app", {
  auth: {
    initAuth,
    getAuthIDToken,
    getGithubCredentialFromResult,
    getSignInMethodsForEmail,
    isSignInWithEmailLink,
    linkWithFBCredential,
    linkWithFBCredentialFromAuthError,
    setDisplayName,
    setEmailAddress,
    setProviderInfo,
    signInUserWithGithub,
    signInUserWithGoogle,
    signInUserWithMicrosoft,
    signInWithEmail,
    signInWithEmailAndPassword,
    signInWithEmailLink,
    signOutUser,
    verifyEmailAddress,
    waitProbableLoginToConfirm,
    authEvents$,
    authIdToken$,
    currentUser$,
    probableUser$,
  },
})
