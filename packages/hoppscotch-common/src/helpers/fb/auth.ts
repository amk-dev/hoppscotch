import {
  User,
  ActionCodeSettings,
  AuthCredential,
  UserCredential,
  OAuthCredential,
} from "firebase/auth"

import { BehaviorSubject, Subject } from "rxjs"
import { getPlatformConfig } from "~/platform"

export type HoppUser = User & {
  provider?: string
  accessToken?: string
}

export type AuthEvent =
  | { event: "probable_login"; user: HoppUser } // We have previous login state, but the app is waiting for authentication
  | { event: "login"; user: HoppUser } // We are authenticated
  | { event: "logout" } // No authentication and we have no previous state
  | { event: "authTokenUpdate"; user: HoppUser; newToken: string | null } // Token has been updated

/**
 * A BehaviorSubject emitting the currently logged in user (or null if not logged in)
 */
export const currentUser$ = getPlatformConfig().auth.currentUser$
/**
 * A BehaviorSubject emitting the current idToken
 */
export const authIdToken$ = getPlatformConfig().auth.authIdToken$

/**
 * A subject that emits events related to authentication flows
 */
export const authEvents$ = getPlatformConfig().auth.authEvents$

/**
 * Like currentUser$ but also gives probable user value
 */
export const probableUser$ = getPlatformConfig().auth.authEvents$

/**
 * Resolves when the probable login resolves into proper login
 */
export const waitProbableLoginToConfirm =
  getPlatformConfig().auth.waitProbableLoginToConfirm

/**
 * Initializes the firebase authentication related subjects
 */
export const initAuth = getPlatformConfig().auth.initAuth

export const getAuthIDToken = getPlatformConfig().auth.getAuthIDToken

/**
 * Sign user in with a popup using Google
 */
export const signInUserWithGoogle =
  getPlatformConfig().auth.signInUserWithGoogle

/**
 * Sign user in with a popup using Github
 */
export const signInUserWithGithub =
  getPlatformConfig().auth.signInUserWithGithub

/**
 * Sign user in with a popup using Microsoft
 */
export const signInUserWithMicrosoft =
  getPlatformConfig().auth.signInUserWithMicrosoft

/**
 * Sign user in with email and password
 */
export const signInWithEmailAndPassword =
  getPlatformConfig().auth.signInWithEmailAndPassword

/**
 * Gets the sign in methods for a given email address
 *
 * @param email - Email to get the methods of
 *
 * @returns Promise for string array of the auth provider methods accessible
 */
export const getSignInMethodsForEmail =
  getPlatformConfig().auth.getSignInMethodsForEmail

export const linkWithFBCredential =
  getPlatformConfig().auth.linkWithFBCredential

/**
 * Links account with another account given in a auth/account-exists-with-different-credential error
 *
 * @param error - Error caught after trying to login
 *
 * @returns Promise of UserCredential
 */
export const linkWithFBCredentialFromAuthError =
  getPlatformConfig().auth.linkWithFBCredentialFromAuthError

/**
 * Sends an email with the signin link to the user
 *
 * @param email - Email to send the email to
 * @param actionCodeSettings - The settings to apply to the link
 */
export const signInWithEmail = getPlatformConfig().auth.signInWithEmail

export const isSignInWithEmailLink =
  getPlatformConfig().auth.isSignInWithEmailLink

export const signInWithEmailLink = getPlatformConfig().auth.signInWithEmailLink

/**
 * Signs out the user
 */
export const signOutUser = getPlatformConfig().auth.signOutUser

/**
 * Sets the provider id and relevant provider auth token
 * as user metadata
 *
 * @param id - The provider ID
 * @param token - The relevant auth token for the given provider
 */
export const setProviderInfo = getPlatformConfig().auth.setProviderInfo

/**
 * Sets the user's display name
 *
 * @param name - The new display name
 */
export const setDisplayName = getPlatformConfig().auth.setDisplayName

/**
 * Send user's email address verification mail
 */
export const verifyEmailAddress = getPlatformConfig().auth.verifyEmailAddress

/**
 * Sets the user's email address
 *
 * @param email - The new email address
 */
export const setEmailAddress = getPlatformConfig().auth.setEmailAddress

export const getGithubCredentialFromResult =
  getPlatformConfig().auth.getGithubCredentialFromResult

export type CommonAuthModuleDefinition = {
  waitProbableLoginToConfirm: () => Promise<void>
  initAuth: () => void
  getAuthIDToken: () => string | null
  signInUserWithGoogle: () => Promise<UserCredential>
  signInUserWithGithub: () => Promise<UserCredential>
  signInUserWithMicrosoft: () => Promise<UserCredential>
  signInWithEmailAndPassword: (
    email: string,
    password: string
  ) => Promise<UserCredential>
  getSignInMethodsForEmail: (email: string) => Promise<string[]>
  linkWithFBCredential: (
    user: User,
    credential: AuthCredential
  ) => Promise<UserCredential>
  linkWithFBCredentialFromAuthError: (error: unknown) => Promise<UserCredential>
  signInWithEmail: (
    email: string,
    actionCodeSettings: ActionCodeSettings
  ) => Promise<void>
  isSignInWithEmailLink: (url: string) => boolean
  signInWithEmailLink: (email: string, url: string) => Promise<UserCredential>
  signOutUser: () => Promise<void>
  setProviderInfo: (id: string, token: string) => Promise<void>
  setDisplayName: (name: string) => Promise<void>
  verifyEmailAddress: () => Promise<void>
  setEmailAddress: (email: string) => Promise<void>
  getGithubCredentialFromResult: (
    result: UserCredential
  ) => OAuthCredential | null
  // variables
  currentUser$: BehaviorSubject<HoppUser | null>
  authIdToken$: BehaviorSubject<string | null>
  authEvents$: Subject<AuthEvent>
  probableUser$: BehaviorSubject<HoppUser | null>
}
