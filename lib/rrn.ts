/** 주민번호 마스킹: 앞 6자리 + "-" + 뒷자리 첫 글자만 표시 */
export function maskRRN(rrn: string) {
  const clean = rrn.replace(/[^0-9]/g, "");
  if (clean.length !== 13) return "";
  return `${clean.slice(0, 6)}-${clean.slice(6, 7)}******`;
}

export async function hashRRN(rrn: string) {
  const clean = rrn.replace(/[^0-9]/g, "");
  const enc = new TextEncoder().encode(clean);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  const arr = Array.from(new Uint8Array(digest));
  return arr.map(b => b.toString(16).padStart(2, "0")).join(""); // hex
}


export function isValidRRN(input: string, opts?: { forbidFutureBirth?: boolean }): boolean {
  const { forbidFutureBirth = true } = opts ?? {};

  // 1) 정규화: 숫자만 남기고 13자리 확인
  const digits = input.replace(/\D/g, "");
  if (!/^\d{13}$/.test(digits)) return false;

  // 2) 파싱
  const yy = Number(digits.slice(0, 2));
  const mm = Number(digits.slice(2, 4));
  const dd = Number(digits.slice(4, 6));
  const s  = Number(digits[6]);

  // 3) 세기/성별/내외국인 코드에 따른 연도 환산
  let fullYear: number | null = null;
  switch (s) {
    case 1: case 2: case 5: case 6: // 1900~1999
      fullYear = 1900 + yy; break;
    case 3: case 4: case 7: case 8: // 2000~2099
      fullYear = 2000 + yy; break;
    case 9: case 0:                 // 1800~1899 (레거시)
      fullYear = 1800 + yy; break;
    default:
      return false;
  }

  if (mm < 1 || mm > 12) return false;
  if (dd < 1 || dd > 31) return false;
  const date = new Date(fullYear, mm - 1, dd);
  if (
    date.getFullYear() !== fullYear ||
    date.getMonth() !== mm - 1 ||
    date.getDate() !== dd
  ) {
    return false;
  }

  if (forbidFutureBirth) {
    const today = new Date();
    if (date.getTime() > new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) {
      return false;
    }
  }

  const weights = [2,3,4,5,6,7,8,9,2,3,4,5];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(digits[i]) * weights[i];
  }
  const check = (11 - (sum % 11)) % 10;
  return check === Number(digits[12]);
}