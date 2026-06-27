import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetVoiceConfig, useUpdateVoiceConfig, getGetVoiceConfigQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const voiceSchema = z.object({
  enabled: z.boolean().default(false),
  categoryId: z.string().nullable().optional(),
  channelId: z.string().nullable().optional(),
  defaultName: z.string().min(1, "Default name is required"),
});

export default function Voice() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useGetVoiceConfig();
  const updateConfig = useUpdateVoiceConfig();

  const form = useForm<z.infer<typeof voiceSchema>>({
    resolver: zodResolver(voiceSchema),
    defaultValues: {
      enabled: false,
      categoryId: "",
      channelId: "",
      defaultName: "Voice Channel",
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        enabled: config.enabled,
        categoryId: config.categoryId || "",
        channelId: config.channelId || "",
        defaultName: config.defaultName,
      });
    }
  }, [config, form]);

  const onSubmit = (values: z.infer<typeof voiceSchema>) => {
    updateConfig.mutate({ 
      data: {
        ...values,
        categoryId: values.categoryId || null,
        channelId: values.channelId || null,
      } 
    }, {
      onSuccess: () => {
        toast({ title: "Settings updated", description: "Voice configuration saved." });
        queryClient.invalidateQueries({ queryKey: getGetVoiceConfigQueryKey() });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to save configuration.", variant: "destructive" });
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
        <h1 className="text-3xl font-bold tracking-tight">Temporary Voice</h1>
        <p className="text-muted-foreground mt-1">Configure join-to-create voice channels.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Set up the hub channel and generation settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Feature</FormLabel>
                      <FormDescription>
                        Turn on or off the temporary voice channel system.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category ID</FormLabel>
                      <FormControl>
                        <Input placeholder="000000000000000000" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormDescription>Where new channels will be created.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="channelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hub Channel ID</FormLabel>
                      <FormControl>
                        <Input placeholder="000000000000000000" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormDescription>The "Join to Create" voice channel.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="defaultName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Channel Name</FormLabel>
                    <FormControl>
                      <Input placeholder="{user}'s channel" {...field} />
                    </FormControl>
                    <FormDescription>Use {'{user}'} to insert the creator's name.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={updateConfig.isPending}>
                {updateConfig.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
