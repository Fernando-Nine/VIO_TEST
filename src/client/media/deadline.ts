// Bounds optional browser operations that can remain pending after a device/network change.
// This does not cancel or bypass a permission request.
export async function mediaDeadline<T>(
  operation: Promise<T>,
  message: string,
  ms = 5000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
