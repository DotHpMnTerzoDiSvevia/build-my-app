import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useEffect } from "react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-md py-8">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Welcome to TheVault</h1>
        <p className="mb-6 text-sm text-muted-foreground">Sign in or create an account to start buying and selling.</p>
        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin"><SignInForm /></TabsContent>
          <TabsContent value="signup"><SignUpForm /></TabsContent>
        </Tabs>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to TheVault's terms of use.{" "}
          <Link to="/" className="underline underline-offset-2">Back home</Link>
        </p>
      </div>
    </AppLayout>
  );
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate({ to: "/" });
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <Field id="si-email" label="Email" type="email" value={email} onChange={setEmail} />
      <Field id="si-pw" label="Password" type="password" value={pw} onChange={setPw} />
      <Button className="w-full" disabled={busy} type="submit">
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

function SignUpForm() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return toast.error("Password must be at least 8 characters.");
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password: pw,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { username, full_name: username },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created!");
    navigate({ to: "/" });
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <Field id="su-username" label="Username" value={username} onChange={setUsername} />
      <Field id="su-email" label="Email" type="email" value={email} onChange={setEmail} />
      <Field id="su-pw" label="Password" type="password" value={pw} onChange={setPw} />
      <Button className="w-full" disabled={busy} type="submit">
        {busy ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

function Field({
  id, label, type = "text", value, onChange,
}: { id: string; label: string; type?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} required />
    </div>
  );
}
