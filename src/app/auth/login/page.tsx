import GoogleLoginButton from "./_/components/GoogleLoginButton";

async function LoginPage() {
  return (
    <div className="flex h-[100dvh] w-[100dvw] flex-col items-center justify-center pb-[60%] text-center">
      <p className="relative inline-block bg-gradient-to-r from-blue-800 to-sky-200 bg-clip-text text-5xl leading-normal font-black tracking-tight text-transparent">
        DevHong
      </p>
      <p className="leading-auto text-5xl leading-none text-black">📸</p>
      <p className="relative mb-7 inline-block bg-gradient-to-r from-sky-200 to-blue-800 bg-clip-text text-5xl leading-normal font-black tracking-tight text-transparent">
        Backup Server
      </p>

      <GoogleLoginButton />

      <p className="mt-8 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
        ⚠️ 이 서비스는 개인 백업용입니다.
        <br />
        해킹, 무단 접근, 불법적인 사용 시<br />
        법적 책임을 질 수 있습니다.
      </p>
    </div>
  );
}

export default LoginPage;
