import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetWebhooks, useSendWebhookMessage } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Plus, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";

const embedSchema = z.object({
  webhookId: z.string().min(1, "Webhook is required"),
  content: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  thumbnailUrl: z.string().url().optional().or(z.literal('')),
  footerText: z.string().optional(),
  authorName: z.string().optional(),
  authorIconUrl: z.string().url().optional().or(z.literal('')),
  timestamp: z.boolean().default(false),
  fields: z.array(z.object({
    name: z.string().min(1, "Field name required"),
    value: z.string().min(1, "Field value required"),
    inline: z.boolean().default(false)
  })).max(10)
});

export default function Embeds() {
  const { toast } = useToast();
  const { data: webhooks } = useGetWebhooks();
  const sendMessage = useSendWebhookMessage();

  const form = useForm<z.infer<typeof embedSchema>>({
    resolver: zodResolver(embedSchema),
    defaultValues: {
      webhookId: "",
      content: "",
      title: "New Embed",
      description: "This is a description",
      color: "#5865F2",
      imageUrl: "",
      thumbnailUrl: "",
      footerText: "",
      authorName: "",
      authorIconUrl: "",
      timestamp: true,
      fields: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "fields"
  });

  const watchedValues = form.watch();

  const onSubmit = (values: z.infer<typeof embedSchema>) => {
    const webhook = webhooks?.find(w => w.id.toString() === values.webhookId);
    if (!webhook) return;

    sendMessage.mutate({
      webhookId: webhook.id,
      data: {
        content: values.content || null,
        embed: {
          title: values.title || null,
          description: values.description || null,
          color: values.color || null,
          imageUrl: values.imageUrl || null,
          thumbnailUrl: values.thumbnailUrl || null,
          footerText: values.footerText || null,
          authorName: values.authorName || null,
          authorIconUrl: values.authorIconUrl || null,
          timestamp: values.timestamp,
          fields: values.fields.length > 0 ? values.fields : undefined,
        }
      }
    }, {
      onSuccess: () => {
        toast({ title: "Sent!", description: "Message sent to webhook successfully." });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Embed Builder</h1>
        <p className="text-muted-foreground mt-1">Design and send rich messages to your server.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor */}
        <Card className="order-2 lg:order-1 h-fit">
          <CardHeader>
            <CardTitle>Editor</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <FormField
                  control={form.control}
                  name="webhookId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Webhook *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a webhook" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {webhooks?.map(hook => (
                            <SelectItem key={hook.id} value={hook.id.toString()}>{hook.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-lg">Message</h3>
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plain Text Content</FormLabel>
                        <FormControl><Textarea placeholder="Optional message above embed..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-lg">Embed Layout</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input type="color" className="w-12 p-1 h-9" {...field} />
                            </FormControl>
                            <FormControl>
                              <Input className="flex-1" {...field} />
                            </FormControl>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Textarea rows={4} {...field} /></FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="authorName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Author Name</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="authorIconUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Author Icon URL</FormLabel>
                          <FormControl><Input type="url" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="thumbnailUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Thumbnail URL</FormLabel>
                          <FormControl><Input type="url" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="imageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Large Image URL</FormLabel>
                          <FormControl><Input type="url" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="footerText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Footer Text</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="timestamp"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="m-0">Include Timestamp</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Fields ({fields.length}/10)</h3>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => append({ name: "", value: "", inline: false })}
                      disabled={fields.length >= 10}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add Field
                    </Button>
                  </div>

                  {fields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-md relative bg-muted/20">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 text-destructive hover:bg-destructive/10"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      
                      <div className="space-y-4 pr-8">
                        <FormField
                          control={form.control}
                          name={`fields.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`fields.${index}.value`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Value</FormLabel>
                              <FormControl><Textarea rows={2} {...field} /></FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`fields.${index}.inline`}
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="m-0">Inline Field</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <Button type="submit" className="w-full h-12 text-lg" disabled={sendMessage.isPending}>
                  <Send className="w-5 h-5 mr-2" /> 
                  {sendMessage.isPending ? "Sending..." : "Send to Discord"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <div className="order-1 lg:order-2 lg:sticky lg:top-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Eye className="w-4 h-4" /> Live Preview
          </h2>
          <div className="bg-[#313338] text-[#dbdee1] p-4 rounded-md font-sans text-[0.9375rem] leading-[1.375rem] whitespace-pre-wrap break-words">
            
            {watchedValues.content && (
              <div className="mb-2 text-[#dbdee1]">{watchedValues.content}</div>
            )}

            <div className="flex bg-[#2b2d31] rounded-[4px] border-l-[4px] mt-2 w-full max-w-[520px]" style={{ borderLeftColor: watchedValues.color || '#202225' }}>
              <div className="p-4 flex flex-col w-full">
                
                {/* Author */}
                {(watchedValues.authorName || watchedValues.authorIconUrl) && (
                  <div className="flex items-center gap-2 mb-2">
                    {watchedValues.authorIconUrl && (
                      <img src={watchedValues.authorIconUrl} alt="Author" className="w-6 h-6 rounded-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
                    )}
                    {watchedValues.authorName && (
                      <span className="font-semibold text-white text-sm">{watchedValues.authorName}</span>
                    )}
                  </div>
                )}

                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col">
                    {/* Title */}
                    {watchedValues.title && (
                      <div className="font-semibold text-white mb-2 text-base">{watchedValues.title}</div>
                    )}
                    
                    {/* Description */}
                    {watchedValues.description && (
                      <div className="text-sm mb-4">{watchedValues.description}</div>
                    )}

                    {/* Fields */}
                    {watchedValues.fields && watchedValues.fields.length > 0 && (
                      <div className="flex flex-wrap gap-x-6 gap-y-4 mb-4">
                        {watchedValues.fields.map((f, i) => (
                          <div key={i} className={`${f.inline ? 'w-[calc(50%-12px)] min-w-[150px]' : 'w-full'}`}>
                            <div className="text-white font-semibold text-sm mb-1">{f.name || '\u200b'}</div>
                            <div className="text-sm">{f.value || '\u200b'}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Thumbnail */}
                  {watchedValues.thumbnailUrl && (
                    <div className="shrink-0 max-w-[80px] max-h-[80px] rounded-md overflow-hidden self-start">
                      <img src={watchedValues.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                    </div>
                  )}
                </div>

                {/* Main Image */}
                {watchedValues.imageUrl && (
                  <div className="mt-4 rounded-md overflow-hidden max-w-[400px]">
                    <img src={watchedValues.imageUrl} alt="Embed" className="max-w-full object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                  </div>
                )}

                {/* Footer */}
                {(watchedValues.footerText || watchedValues.timestamp) && (
                  <div className="flex items-center gap-2 mt-4 text-xs font-medium">
                    {watchedValues.footerText && <span>{watchedValues.footerText}</span>}
                    {watchedValues.footerText && watchedValues.timestamp && <span className="mx-1">•</span>}
                    {watchedValues.timestamp && <span>{format(new Date(), "MM/dd/yyyy h:mm a")}</span>}
                  </div>
                )}

              </div>
            </div>
            
            {/* If no content at all */}
            {!watchedValues.content && !watchedValues.title && !watchedValues.description && !watchedValues.authorName && !watchedValues.footerText && (!watchedValues.fields || watchedValues.fields.length === 0) && (
              <div className="text-center opacity-50 italic py-4">Start typing to see preview...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
