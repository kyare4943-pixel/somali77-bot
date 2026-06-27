import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetWebhooks, useCreateWebhook, useDeleteWebhook, getGetWebhooksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Webhook, Plus, Trash2, Link as LinkIcon } from "lucide-react";
import { format } from "date-fns";

const webhookSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Must be a valid URL"),
  channelId: z.string().optional(),
  avatarUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
});

export default function Webhooks() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: webhooks, isLoading } = useGetWebhooks();
  const createWebhook = useCreateWebhook();
  const deleteWebhook = useDeleteWebhook();

  const form = useForm<z.infer<typeof webhookSchema>>({
    resolver: zodResolver(webhookSchema),
    defaultValues: {
      name: "",
      url: "",
      channelId: "",
      avatarUrl: "",
    },
  });

  const onSubmit = (values: z.infer<typeof webhookSchema>) => {
    createWebhook.mutate({ 
      data: {
        name: values.name,
        url: values.url,
        channelId: values.channelId || null,
        avatarUrl: values.avatarUrl || null,
      } 
    }, {
      onSuccess: () => {
        toast({ title: "Webhook created", description: "Successfully registered new webhook." });
        queryClient.invalidateQueries({ queryKey: getGetWebhooksQueryKey() });
        setOpen(false);
        form.reset();
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to create webhook.", variant: "destructive" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this webhook?")) {
      deleteWebhook.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Webhook deleted" });
          queryClient.invalidateQueries({ queryKey: getGetWebhooksQueryKey() });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to delete webhook.", variant: "destructive" });
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground mt-1">Manage discord webhooks for automated messaging.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> New Webhook</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Webhook</DialogTitle>
              <DialogDescription>Register a new discord webhook to use in the embed builder.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl><Input placeholder="General Announcements" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook URL</FormLabel>
                      <FormControl><Input type="url" placeholder="https://discord.com/api/webhooks/..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="channelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Channel ID (Optional)</FormLabel>
                      <FormControl><Input placeholder="000000000000000000" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="avatarUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Avatar URL (Optional)</FormLabel>
                      <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createWebhook.isPending}>
                  {createWebhook.isPending ? "Saving..." : "Save Webhook"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <>
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </>
        ) : !webhooks?.length ? (
          <div className="col-span-full p-12 text-center border rounded-lg border-dashed text-muted-foreground">
            No webhooks registered. Click "New Webhook" to add one.
          </div>
        ) : (
          webhooks.map((hook) => (
            <Card key={hook.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="w-5 h-5 text-primary" />
                    {hook.name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Added {format(new Date(hook.createdAt), 'MMM d, yyyy')}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground break-all">
                  <LinkIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{hook.url.substring(0, 40)}...</span>
                </div>
                {hook.channelId && (
                  <div className="text-xs px-2 py-1 bg-secondary rounded-md inline-block mt-2">
                    Channel: {hook.channelId}
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-muted/50 p-4 border-t mt-auto">
                <Button variant="destructive" size="sm" className="w-full" onClick={() => handleDelete(hook.id)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
