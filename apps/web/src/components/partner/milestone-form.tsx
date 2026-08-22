'use client';

import { useState } from 'react';
import { MILESTONE_LABELS, MILESTONE_TYPES, MILESTONES_REQUIRING_PHOTO } from '@gridx/shared';
import { CheckCircle2, CloudUpload, Loader2 } from 'lucide-react';

import { FileUpload } from '@/components/app/file-upload';
import { photosSupported, queuePhotos } from '@/lib/offline-photos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { newRequestId, submit } from '@/lib/offline';
import type { Language } from '@/lib/i18n';

type Outcome = 'sent' | 'queued' | 'rejected' | null;

export function MilestoneForm({
  jobId,
  language,
}: {
  jobId: string;
  language: Language;
}): React.JSX.Element {
  const [type, setType] = useState<string>(MILESTONE_TYPES[0]);
  const [quantity, setQuantity] = useState('');
  const [remarks, setRemarks] = useState('');
  const [photographFileIds, setPhotographFileIds] = useState<string[]>([]);
  // Photographs chosen while offline. They are written to IndexedDB on submit and uploaded when
  // the connection returns, ahead of the milestone that cites them.
  const [deferredPhotos, setDeferredPhotos] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setPending(true);
    setOutcome(null);
    const clientRequestId = newRequestId();
    const photoIds =
      deferredPhotos.length > 0 && photosSupported()
        ? await queuePhotos(clientRequestId, deferredPhotos, 'PHOTOGRAPH')
        : [];

    const result = await submit({
      clientRequestId,
      path: `/jobs/${jobId}/milestones`,
      label: MILESTONE_LABELS[type as keyof typeof MILESTONE_LABELS] ?? type,
      photoIds,
      body: {
        type,
        quantityCompleted: quantity === '' ? undefined : Number(quantity),
        remarks: remarks === '' ? undefined : remarks,
        photographFileIds,
      },
    });
    setOutcome(result);
    setPending(false);
    if (result !== 'rejected') {
      setQuantity('');
      setRemarks('');
      setPhotographFileIds([]);
      setDeferredPhotos([]);
    }
  };

  const photoNeeded = MILESTONES_REQUIRING_PHOTO.includes(type as (typeof MILESTONES_REQUIRING_PHOTO)[number]);

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-card p-4">
      <div className="space-y-2">
        <Label htmlFor="milestone-type">{language === 'HI' ? 'प्रगति' : 'Milestone'}</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger id="milestone-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MILESTONE_TYPES.map((value) => (
              <SelectItem key={value} value={value}>
                {MILESTONE_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="milestone-quantity">{language === 'HI' ? 'पूरी मात्रा' : 'Quantity completed'}</Label>
          <Input
            id="milestone-quantity"
            type="number"
            inputMode="numeric"
            value={quantity}
            onChange={(event) => setQuantity(event.currentTarget.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="milestone-remarks">{language === 'HI' ? 'टिप्पणी' : 'Remarks'}</Label>
          <Textarea
            id="milestone-remarks"
            rows={2}
            value={remarks}
            onChange={(event) => setRemarks(event.currentTarget.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>
          {language === 'HI' ? 'फ़ोटो' : 'Photographs'}
          {photoNeeded ? <span className="ml-1 text-destructive">*</span> : null}
        </Label>
        <FileUpload
          name="photographFileIds"
          category="PHOTOGRAPH"
          accept="image/*"
          multiple
          required={photoNeeded}
          onChange={setPhotographFileIds}
          onDeferred={setDeferredPhotos}
          label={language === 'HI' ? 'फ़ोटो जोड़ें' : 'Add photos'}
        />
        {photoNeeded ? (
          <p className="flex items-start gap-2 rounded-md bg-secondary p-3 text-xs text-muted-foreground">
            <CloudUpload className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {language === 'HI'
              ? 'इस चरण के लिए फ़ोटो ज़रूरी है। नेटवर्क न हो तो फ़ोटो फ़ोन में सुरक्षित रहेगी और कनेक्शन आते ही अपने आप भेज दी जाएगी।'
              : 'This milestone expects photographic evidence. With no connection the photos are held on your phone and sent automatically once you are back online.'}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {language === 'HI' ? 'भेजें' : 'Save update'}
        </Button>
        {outcome === 'sent' ? (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            {language === 'HI' ? 'भेज दिया' : 'Sent'}
          </span>
        ) : null}
        {outcome === 'queued' ? (
          <span className="text-sm text-amber-600">
            {language === 'HI' ? 'ऑफ़लाइन सुरक्षित — बाद में सिंक होगा' : 'Saved offline — will sync automatically'}
          </span>
        ) : null}
        {outcome === 'rejected' ? (
          <span className="text-sm text-destructive">
            {language === 'HI' ? 'भेजने में समस्या — कृपया जाँचें' : 'Rejected by the server — check the values'}
          </span>
        ) : null}
      </div>
    </form>
  );
}
