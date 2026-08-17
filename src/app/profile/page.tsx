"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save, ShieldCheck, Mail } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { MeResponse } from "@/types/auth";

/**
 * Mirrors ProfileUpdate in app/schemas/auth.py. Keeping the limits identical
 * means the user sees a validation message as they type rather than a 422
 * after a round trip.
 */
const profileSchema = z.object({
  username: z.string().min(1, "Username is required").max(60),
  avatar_url: z
    .union([
      z.literal(""),
      z.string().refine((v) => /^https?:\/\//.test(v), {
        message: "Must start with http:// or https://",
      }),
    ])
    .optional(),
  mobile: z.string().max(25).optional(),
  address: z.string().max(300).optional(),
  bio: z.string().max(500).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setMe } = useSession();

  const { data, isLoading } = useQuery<MeResponse>({
    queryKey: ["me"],
    queryFn: async () => (await api.get<MeResponse>("/auth/me")).data,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
      avatar_url: "",
      mobile: "",
      address: "",
      bio: "",
    },
  });

  // The form starts blank because the query has not resolved on first render.
  // Resetting with the server values makes them the new baseline, which is what
  // keeps `isDirty` meaningful — otherwise Save would light up immediately.
  useEffect(() => {
    if (!data) return;
    reset({
      username: data.profile.username ?? "",
      avatar_url: data.profile.avatar_url ?? "",
      mobile: data.profile.mobile ?? "",
      address: data.profile.address ?? "",
      bio: data.profile.bio ?? "",
    });
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: async (values: ProfileFormValues) =>
      (await api.patch<MeResponse>("/auth/me/profile", values)).data,
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
      // Keeps the sidebar avatar and name in step without a refetch.
      setMe(updated);
      reset({
        username: updated.profile.username,
        avatar_url: updated.profile.avatar_url,
        mobile: updated.profile.mobile,
        address: updated.profile.address,
        bio: updated.profile.bio,
      });
      toast.success("Profile updated");
    },
    // Errors are surfaced by the axios interceptor already; this only stops
    // react-query from treating the rejection as unhandled.
    onError: () => {},
  });

  const avatarPreview = watch("avatar_url");
  const usernamePreview = watch("username");

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-background">
      {/* Header — matches the /connectors page chrome */}
      <div className="sticky top-0 z-20 w-full bg-background border-b border-border/50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-heading font-bold text-lg tracking-tight">
              Profile
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage how you appear across the app
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        {/* Identity summary */}
        <div className="flex items-center gap-4 p-5 rounded-2xl border border-border/60 bg-card/50 mb-6">
          <Avatar className="h-16 w-16 ring-1 ring-border/60">
            <AvatarImage src={avatarPreview || undefined} alt={usernamePreview} />
            <AvatarFallback className="bg-primary/15 text-primary font-semibold text-lg">
              {(usernamePreview || data?.profile.email || "U")
                .charAt(0)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 space-y-1.5">
            <p className="font-heading font-semibold text-base truncate">
              {usernamePreview || "Unnamed"}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{data?.user.email}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {data?.user.email_verified && (
                <Badge
                  variant="secondary"
                  className="gap-1 text-[10px] font-medium"
                >
                  <ShieldCheck className="h-2.5 w-2.5" />
                  Verified
                </Badge>
              )}
              {data?.user.role === "admin" && (
                <Badge className="text-[10px] font-medium">Admin</Badge>
              )}
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          className="space-y-5"
        >
          <Field
            id="username"
            label="Username"
            error={errors.username?.message}
            hint="Pulled from your sign-in provider — change it any time."
          >
            <Input id="username" {...register("username")} className="rounded-xl" />
          </Field>

          <Field
            id="avatar_url"
            label="Avatar URL"
            error={errors.avatar_url?.message}
            hint="Link to an image. Leave blank to use your initial."
          >
            <Input
              id="avatar_url"
              placeholder="https://…"
              {...register("avatar_url")}
              className="rounded-xl"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="mobile" label="Mobile" error={errors.mobile?.message}>
              <Input
                id="mobile"
                placeholder="+91 90000 00000"
                {...register("mobile")}
                className="rounded-xl"
              />
            </Field>

            <Field id="address" label="Address" error={errors.address?.message}>
              <Input
                id="address"
                placeholder="City, Country"
                {...register("address")}
                className="rounded-xl"
              />
            </Field>
          </div>

          <Field id="bio" label="Bio" error={errors.bio?.message}>
            <Textarea
              id="bio"
              rows={3}
              placeholder="A sentence about you."
              {...register("bio")}
              className="rounded-xl resize-none"
            />
          </Field>

          <div className="flex items-center gap-3 pt-1">
            <Button
              type="submit"
              disabled={!isDirty || mutation.isPending}
              className="gap-2 rounded-xl"
            >
              {mutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save changes
            </Button>

            {isDirty && !mutation.isPending && (
              <span className="text-xs text-muted-foreground">
                Unsaved changes
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      {children}
      <p
        className={cn(
          "text-[11px] leading-relaxed",
          error ? "text-destructive" : "text-muted-foreground/70"
        )}
      >
        {error ?? hint ?? ""}
      </p>
    </div>
  );
}
