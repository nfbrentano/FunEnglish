import { httpsCallable } from "firebase/functions";
import { getFunctionsInstance } from "./firebase";

export interface HealthResponse {
  ok: true;
  timestamp: number;
  echo?: string;
}

/**
 * Checks the health of the Cloud Functions backend (RF02, CA01).
 */
export async function checkFunctionsHealth(echo?: string): Promise<HealthResponse> {
  const functions = getFunctionsInstance();
  const healthCallable = httpsCallable<{ echo?: string } | undefined, HealthResponse>(
    functions,
    "health",
  );
  const result = await healthCallable(echo ? { echo } : undefined);
  return result.data;
}

export interface DeleteStudentResponse {
  success: true;
  deletedStudentId: string;
}

/**
 * Calls the Cloud Function to delete a student and recursively clean up subcollections (RF07, CA06).
 */
export async function callDeleteStudent(studentId: string): Promise<DeleteStudentResponse> {
  const functions = getFunctionsInstance();
  const callable = httpsCallable<{ studentId: string }, DeleteStudentResponse>(
    functions,
    "deleteStudent",
  );
  const result = await callable({ studentId });
  return result.data;
}

export interface CreateStudentInviteResponse {
  code: string;
  studentId: string;
  expiresAt: number;
  expiresInDays: number;
}

export async function callCreateStudentInvite(
  studentId: string,
): Promise<CreateStudentInviteResponse> {
  const functions = getFunctionsInstance();
  const callable = httpsCallable<{ studentId: string }, CreateStudentInviteResponse>(
    functions,
    "createStudentInvite",
  );
  const result = await callable({ studentId });
  return result.data;
}

export interface GetStudentInviteResponse {
  active: boolean;
  code?: string;
  expiresAt?: number;
}

export async function callGetStudentInvite(studentId: string): Promise<GetStudentInviteResponse> {
  const functions = getFunctionsInstance();
  const callable = httpsCallable<{ studentId: string }, GetStudentInviteResponse>(
    functions,
    "getStudentInvite",
  );
  const result = await callable({ studentId });
  return result.data;
}

export interface RevokeStudentInviteResponse {
  success: true;
}

export async function callRevokeStudentInvite(
  studentId: string,
): Promise<RevokeStudentInviteResponse> {
  const functions = getFunctionsInstance();
  const callable = httpsCallable<{ studentId: string }, RevokeStudentInviteResponse>(
    functions,
    "revokeStudentInvite",
  );
  const result = await callable({ studentId });
  return result.data;
}

export interface RemovePortalAccessResponse {
  success: true;
}

export async function callRemovePortalAccess(studentId: string): Promise<RemovePortalAccessResponse> {
  const functions = getFunctionsInstance();
  const callable = httpsCallable<{ studentId: string }, RemovePortalAccessResponse>(
    functions,
    "removePortalAccess",
  );
  const result = await callable({ studentId });
  return result.data;
}

export interface ValidateInviteResponse {
  valid: boolean;
  studentName?: string;
  teacherName?: string;
  error?: string;
}

export async function callValidateInvite(code: string): Promise<ValidateInviteResponse> {
  const functions = getFunctionsInstance();
  const callable = httpsCallable<{ code: string }, ValidateInviteResponse>(
    functions,
    "validateInvite",
  );
  const result = await callable({ code });
  return result.data;
}

export interface RedeemInviteResponse {
  success: true;
  studentId: string;
}

export async function callRedeemInvite(code: string): Promise<RedeemInviteResponse> {
  const functions = getFunctionsInstance();
  const callable = httpsCallable<{ code: string }, RedeemInviteResponse>(
    functions,
    "redeemInvite",
  );
  const result = await callable({ code });
  return result.data;
}

/* =========================================================================
 * Homework Functions (spec 10)
 * ========================================================================= */
export interface CreateHomeworkInputPayload {
  activityId: string;
  targetType: "class" | "students" | "anyone";
  classId?: string;
  studentIds?: string[];
  dueDate?: string | null;
  instruction?: string;
  allowLate?: boolean;
}

export interface IndividualLinkPayload {
  studentId: string;
  studentName: string;
  token: string;
}

export interface CreateHomeworkResponse {
  homeworkId: string;
  individualLinks?: IndividualLinkPayload[];
}

export async function callCreateHomework(
  payload: CreateHomeworkInputPayload,
): Promise<CreateHomeworkResponse> {
  const functions = getFunctionsInstance();
  const callable = httpsCallable<CreateHomeworkInputPayload, CreateHomeworkResponse>(
    functions,
    "createHomework",
  );
  const result = await callable(payload);
  return result.data;
}

export interface GetHomeworkForStudentPayload {
  homeworkId: string;
  studentToken?: string;
}

export interface GetHomeworkForStudentResponse {
  valid: boolean;
  error?: string;
  isClosed?: boolean;
  isExpired?: boolean;
  homework?: {
    id: string;
    activityId: string;
    activitySlug: string;
    activityTitle: string;
    activityType: string;
    targetType: "class" | "students" | "anyone";
    className?: string | null;
    classRoster?: Array<{ studentId: string; firstName: string }>;
    dueDate?: string | null;
    instruction?: string;
    allowLate: boolean;
    open: boolean;
  };
  student?: {
    studentId: string;
    firstName: string;
  };
  activityContent?: unknown;
}

export async function callGetHomeworkForStudent(
  payload: GetHomeworkForStudentPayload,
): Promise<GetHomeworkForStudentResponse> {
  const functions = getFunctionsInstance();
  const callable = httpsCallable<GetHomeworkForStudentPayload, GetHomeworkForStudentResponse>(
    functions,
    "getHomeworkForStudent",
  );
  const result = await callable(payload);
  return result.data;
}

export interface VerifyStudentPinPayload {
  studentId: string;
  pin: string;
}

export interface VerifyStudentPinResponse {
  success: boolean;
  studentName?: string;
  locked?: boolean;
}

export async function callVerifyStudentPin(
  payload: VerifyStudentPinPayload,
): Promise<VerifyStudentPinResponse> {
  const functions = getFunctionsInstance();
  const callable = httpsCallable<VerifyStudentPinPayload, VerifyStudentPinResponse>(
    functions,
    "verifyStudentPin",
  );
  const result = await callable(payload);
  return result.data;
}

export interface RegenerateTokenPayload {
  homeworkId: string;
  studentId: string;
}

export interface RegenerateTokenResponse {
  token: string;
}

export async function callRegenerateStudentHomeworkToken(
  payload: RegenerateTokenPayload,
): Promise<RegenerateTokenResponse> {
  const functions = getFunctionsInstance();
  const callable = httpsCallable<RegenerateTokenPayload, RegenerateTokenResponse>(
    functions,
    "regenerateStudentHomeworkToken",
  );
  const result = await callable(payload);
  return result.data;
}

export interface SubmitHomeworkPayload {
  homeworkId: string;
  via: "token" | "pin" | "portal" | "anonymous";
  studentToken?: string;
  studentId?: string;
  studentPin?: string;
  studentName?: string;
  seconds: number;
  answers: unknown[];
}

export interface SubmitHomeworkResponse {
  success: true;
  submissionId: string;
  correct: number;
  total: number;
  seconds: number;
  late: boolean;
}

export async function callSubmitHomework(
  payload: SubmitHomeworkPayload,
): Promise<SubmitHomeworkResponse> {
  const functions = getFunctionsInstance();
  const callable = httpsCallable<SubmitHomeworkPayload, SubmitHomeworkResponse>(
    functions,
    "submitHomework",
  );
  const result = await callable(payload);
  return result.data;
}

