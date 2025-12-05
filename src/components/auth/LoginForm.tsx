/**
 * src/components/auth/LoginForm.tsx
 * Interaktywny formularz logowania
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { LoginSchema, type LoginFormData } from "@/lib/schemas/auth";
import { supabaseBrowser } from "@/db/supabase.browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);

    try {
      // Wywołanie Supabase Auth
      const { data: authData, error } = await supabaseBrowser.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        // Obsługa błędów logowania
        if (error.message === "Invalid login credentials") {
          setServerError("Nieprawidłowy email lub hasło");
        } else {
          setServerError("Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.");
        }
        return;
      }

      // Sukces logowania - pobierz rolę użytkownika
      if (authData.user && authData.session) {
        // Pobierz profil użytkownika z tabeli profiles aby sprawdzić rolę
        const { data: profile, error: profileError } = await supabaseBrowser
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .single();

        if (profileError || !profile) {
          setServerError("Nie udało się pobrać danych użytkownika");
          return;
        }

        // Odczekaj chwilę aby sesja została zapisana w storage
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Przekierowanie na podstawie roli
        // Admin → panel admina, User → lista produktów (strona główna)
        const redirectUrl = profile.role === "admin" ? "/admin" : "/";

        // Użyj window.location.replace aby nie dodawać do historii
        window.location.replace(redirectUrl);
      }
    } catch (err) {
      console.error("Login error:", err);
      setServerError("Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.");
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Logowanie</CardTitle>
        <CardDescription>Wprowadź swoje dane aby się zalogować</CardDescription>
      </CardHeader>
      <CardContent>
        {serverError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="twoj@email.com" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hasło</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logowanie...
                </>
              ) : (
                "Zaloguj się"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

