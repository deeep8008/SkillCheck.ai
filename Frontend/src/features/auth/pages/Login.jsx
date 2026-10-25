import { Link } from "react-router";

const Login = () => {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6">
      <form
        className="w-full max-w-md border border-neutral-800 border-t-4 border-t-red-600 bg-neutral-900 p-6 sm:p-10"
        onSubmit={(event) => event.preventDefault()}
      >
        <p className="mb-10 text-xl font-bold tracking-tight">SkillCheck<span className="text-red-500">.ai</span></p>
        <h1 className="mb-8 text-3xl font-bold">Login</h1>

        <label className="mb-6 block space-y-2 text-sm text-neutral-300">
          <span>Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="Enter your email address"
            required
            className="w-full border border-neutral-700 bg-neutral-950 px-4 py-3 text-white placeholder:text-neutral-500 focus:border-red-500 focus:outline-2 focus:outline-red-500"
          />
        </label>

        <label className="mb-8 block space-y-2 text-sm text-neutral-300">
          <span>Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            required
            className="w-full border border-neutral-700 bg-neutral-950 px-4 py-3 text-white placeholder:text-neutral-500 focus:border-red-500 focus:outline-2 focus:outline-red-500"
          />
        </label>

        <button
          type="submit"
          className="w-full cursor-pointer bg-red-600 py-3 font-bold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500"
        >
          Sign in &rarr;
        </button>
        <p className="mt-6 text-center text-sm text-neutral-400">
          New here? <Link className="text-red-400 underline underline-offset-4 hover:text-red-300" to="/register">Create an account</Link>
        </p>
      </form>
    </main>
  );
};

export default Login;
