import GoogleLoginButton from "./_/components/GoogleLoginButton";

async function LoginPage() {
  return (
    <div className="flex h-[100dvh] w-[100dvw] flex-col items-center justify-center text-center">
      <h1 className="relative mb-5 inline-block bg-gradient-to-r from-blue-800 to-sky-200 bg-clip-text text-5xl font-black tracking-tight text-transparent">
        DevHong 이미지 백업서버
      </h1>
      <GoogleLoginButton />
    </div>
  );
}

export default LoginPage;
