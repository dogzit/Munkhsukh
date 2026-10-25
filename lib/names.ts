/**
 * Нэвтрэх үед localStorage-д нэр жижиг үсгээр хадгалагддаг ("erhembayr"),
 * харин DB-д анхны хэлбэрээрээ ("Erhembayr") байдаг — тиймээс үсгийн том жижгийг үл хамааран харьцуулна.
 */
export function sameName(a?: string | null, b?: string | null) {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}
