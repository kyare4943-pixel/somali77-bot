import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const settingsSchema = z.object({
  prefix: z.string().min(1, "Prefix is required").max(5, "Prefix too long"),
  language: z.string().min(2, "Language required"),
  logsChannelId: z.string().optional().nullable(),
  welcomeChannelId: z.string().optional().nullable(),
});

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      prefix: "!",
      language: "en",
      logsChannelId: "",
      welcomeChannelId: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        prefix: settings.prefix,
        language: settings.language,
        logsChannelId: settings.logsChannelId || "",
        welcomeChannelId: settings.welcomeChannelId || "",
      });
    }
  }, [settings, form]);

  const onSubmit = (values: z.infer<typeof settingsSchema>) => {
    updateSettings.mutate({ 
      data: {
        prefix: values.prefix,
        language: values.language,
        logsChannelId: values.logsChannelId || null,
        welcomeChannelId: values.welcomeChannelId || null,
      } 
    }, {
      onSuccess: () => {
        toast({ title: "Settings updated", description: "Global bot configuration saved." });
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
      }
    });
  };

  if (isLoading) return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bot Settings</h1>
        <p className="text-muted-foreground mt-1">Manage global bot preferences and logging.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global Configuration</CardTitle>
          <CardDescription>Changes apply immediately across the server.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
              
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="prefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Command Prefix</FormLabel>
                      <FormControl>
                        <Input placeholder="!" {...field} />
                      </FormControl>
                      <FormDescription>Character to trigger text commands.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="so">Somali</SelectItem>
                          <SelectItem value="ar">Arabic</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Bot response language.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="logsChannelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Audit Logs Channel ID</FormLabel>
                    <FormControl>
                      <Input placeholder="000000000000000000" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormDescription>Where administrative and game logs are sent.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="welcomeChannelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Welcome Channel ID</FormLabel>
                    <FormControl>
                      <Input placeholder="000000000000000000" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormDescription>Where new member announcements are sent.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={updateSettings.isPending}>
                {updateSettings.isPending ? "Saving..." : "Save Configuration"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
