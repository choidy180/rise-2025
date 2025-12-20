"use client";
import { auth, db } from "@/lib/firebase";
import { hashRRN, maskRRN } from "@/lib/rrn";
import { useProgressStore } from "@/store/progress-stage";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";

/** ✅ 주민등록번호 정밀검증 (형식+날짜+성별코드+체크섬) */
/**
 * 주민등록번호/외국인등록번호 검증
 * - 하이픈 있어도/없어도 OK
 * - 코드:
 *   1,2: 1900~1999 (남/여, 내국인)
 *   3,4: 2000~2099 (남/여, 내국인)
 *   5,6: 1900~1999 (남/여, 외국인)
 *   7,8: 2000~2099 (남/여, 외국인)
 *   9,0: 1800~1899 (남/여, 내국인) — 레거시 케이스
 */
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
    case 9: case 0:               // 1800~1899 (레거시)
      fullYear = 1800 + yy; break;
    default:
      return false; // 알 수 없는 코드
  }

  // 4) 날짜 유효성
  if (mm < 1 || mm > 12) return false;
  if (dd < 1 || dd > 31) return false;
  const date = new Date(fullYear, mm - 1, dd);
  if (
    date.getFullYear() !== fullYear ||
    date.getMonth() !== mm - 1 ||
    date.getDate() !== dd
  ) {
    return false; // 존재하지 않는 날짜
  }

  // (선택) 미래 생년 거부
  if (forbidFutureBirth) {
    const today = new Date();
    // 출생일이 오늘 이후면 거부
    if (date.getTime() > new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) {
      return false;
    }
  }

  // 5) 체크섬 (앞 12자리 × 가중치)
  const weights = [2,3,4,5,6,7,8,9,2,3,4,5];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(digits[i]) * weights[i];
  }
  const check = (11 - (sum % 11)) % 10;
  return check === Number(digits[12]);
}


const JoinPage = () => {
  // 개별 state
  const [username, setUsername] = useState("");
  const [rrn, setRrn] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");

  // 주민번호 자동 하이픈 처리
  const handleRrnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 13);
    const formatted =
      digits.length <= 6 ? digits : `${digits.slice(0, 6)}-${digits.slice(6)}`;
    setRrn(formatted);
  };

  // 간단 검증 로직
  const isUsernameValid = username.length > 0 && username.length <= 10;
  const isEmailValid = /^\S+@\S+\.\S+$/.test(email);
  const isPwValid = pw.length >= 10;
  const isPwMatch = pw.length > 0 && pw === pwConfirm;
  const isRrnValid = isValidRRN(rrn); // ✅ 정밀검증 사용

  const canSubmit = useMemo(
    () => isUsernameValid && isPwValid && isPwMatch && isRrnValid,
    [isUsernameValid, isPwValid, isPwMatch, isRrnValid]
  );


  // Firebase Auth error code → 사용자 메시지 매핑
  function mapAuthErrorMessage(code: string) {
    switch (code) {
      case "auth/email-already-in-use":
        return "이미 사용 중인 이메일입니다.";
      case "auth/invalid-email":
        return "이메일 형식이 올바르지 않습니다.";
      case "auth/weak-password":
        return "비밀번호가 안전하지 않습니다. 더 복잡하게 설정하세요.";
      case "auth/operation-not-allowed":
        return "이메일/비밀번호 로그인이 비활성화되어 있습니다(관리자 설정 필요).";
      case "auth/network-request-failed":
        return "네트워크 오류가 발생했습니다. 잠시 후 다시 시도하세요.";
      default:
        return "회원가입에 실패했습니다. 잠시 후 다시 시도하세요.";
    }
  }
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit){
      return
    };
    try {
      // 1) 계정 생성
      const cred = await createUserWithEmailAndPassword(auth, email, pw);
      await updateProfile(cred.user, {displayName: username});

      // 2) 주민번호 보안 처리(서버권장)
      const rrnHash = await hashRRN(rrn);
      const rrnMask = maskRRN(rrn);

      // firebase 사용자 문서
      await setDoc(doc(db, "users", cred.user.uid), {
        username,
        rrnHash, // 해시만 저장
        rrnMask, // 마스킹 표시용
        pw,
        createAt: serverTimestamp(),
      })
    } catch {

    } finally {
      alert("회원가입 완료!");
    }
  };

  const {setProgress} = useProgressStore();

  useEffect(()=>{
    setProgress(1);
  },[]);

  return (
    <Container>
      <form onSubmit={onSubmit}>
        <h4>회원가입</h4>
        <div className="grid gap-6 mb-6 md:grid-cols-2">
          {/* 사용자 이름 */}
          <div>
            <label htmlFor="username">사용자 이름</label>
            <input
              type="text"
              id="username"
              placeholder="최대 10글자"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-invalid={!isUsernameValid && username.length > 0}
              required
            />
            {!isUsernameValid && username.length > 0 && (
              <Msg role="alert">사용자 이름은 최대 10글자입니다.</Msg>
            )}
          </div>

          {/* 주민등록번호 */}
          <div>
            <label htmlFor="rrn">주민등록번호</label>
            <input
              type="text"
              id="rrn"
              placeholder="######-#######"
              value={rrn}
              onChange={handleRrnChange}
              maxLength={14}
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={!isRrnValid && rrn.length > 0}
              required
            />
            {rrn.length > 0 && !isRrnValid && (
              <Msg role="alert">
                올바른 주민등록번호가 아닙니다. (날짜/성별코드/체크섬 검증 실패)
              </Msg>
            )}
          </div>

          {/* 비밀번호 */}
          <div>
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              placeholder="최소 10글자"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              aria-invalid={!isPwValid && pw.length > 0}
              required
            />
            {!isPwValid && pw.length > 0 && (
              <Msg role="alert">비밀번호는 최소 10글자 이상이어야 합니다.</Msg>
            )}
          </div>

          {/* 비밀번호 확인 */}
          <div>
            <label htmlFor="passwordConfirm">비밀번호 확인</label>
            <input
              type="password"
              id="passwordConfirm"
              placeholder="비밀번호 확인"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              aria-invalid={!isPwMatch && pwConfirm.length > 0}
              required
            />
            {!isPwMatch && pwConfirm.length > 0 && (
              <Msg role="alert">비밀번호가 일치하지 않습니다.</Msg>
            )}
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={!canSubmit}>
          회원가입
        </button>
      </form>
    </Container>
  );
};

export default JoinPage;

/* ====================== styled ====================== */
const Container = styled.div`
  width: 100%;
  height: 100vh;

  display: flex;
  justify-content: center;
  align-items: center;

  background: #f3f4f6;

  form {
    width: calc(100% - 20px);
    max-width: 480px;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
    padding: 1.8rem 2rem;
  }

  h4 {
    font-size: 1.6rem;
    color: #4f46e5;
    margin: 1.2rem 0;
    text-align: center;
  }

  label {
    display: block;
    margin-top: 20px;
    font-weight: 600;
    font-size: 0.9rem;
    color: #111827;
  }

  input {
    width: 100%;
    padding: 0.6rem 0.8rem;
    border: 2px solid #cbd5e1;
    border-radius: 8px;
    font-size: 1rem;
    outline: none;
    margin-top: 4px;
    color: #111827;
    background: #fff;
    transition: border-color 0.18s ease, box-shadow 0.18s ease;

    &::placeholder {
      color: #9ca3af;
    }

    &:focus {
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
    }

    &[aria-invalid="true"] {
      border-color: #ef4444;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
    }
  }

  .submit-btn {
    width: 100%;
    margin-top: 1.5rem;
    padding: 0.8rem;
    font-size: 1rem;
    border: none;
    border-radius: 10px;
    background: #4f46e5;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease, opacity 0.2s ease;

    &:hover {
      background: #4338ca;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
`;

const Msg = styled.p`
  margin-top: 6px;
  font-size: 12px;
  color: #ef4444;
`;
