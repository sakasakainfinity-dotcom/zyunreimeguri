'use client';

import { Dialog, Transition } from '@headlessui/react';
import React, { Fragment, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Place } from '@/lib/types';
import { sanitizeFileName, uploadFilesWithSignedUrls } from '@/lib/upload';

const MAX_FILES = 10;

type VisitFormValues = {
  visited_at?: string;
  note?: string;
};

type VisitModalProps = {
  open: boolean;
  place: Place | null;
  onClose: () => void;
  onCompleted?: (options: { visitId: string }) => void;
};

export function VisitModal({ open, place, onClose, onCompleted }: VisitModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting }
  } = useForm<VisitFormValues>({
    defaultValues: {
      visited_at: new Date().toISOString().slice(0, 10)
    }
  });
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      reset({
        visited_at: new Date().toISOString().slice(0, 10),
        note: ''
      });
      setFiles([]);
      setError(null);
    }
  }, [open, reset]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length + files.length > MAX_FILES) {
      setError('写真は最大10枚までアップロードできます。');
      return;
    }
    setError(null);
    setFiles((prev) => [...prev, ...selectedFiles]);
    event.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!place) return;
    setError(null);

    try {
      const response = await fetch('/api/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place_id: place.id,
          visited_at: values.visited_at ? new Date(values.visited_at).toISOString() : undefined,
          note: values.note?.trim() ? values.note.trim() : undefined
        })
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || '訪問の登録に失敗しました');
      }

      const { visit_id: visitId } = (await response.json()) as { visit_id: string };

      if (files.length > 0) {
        const signedUrlResponse = await fetch(`/api/visit/${visitId}/photos/signed-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: files.map((file) => ({
              name: sanitizeFileName(file.name),
              type: file.type
            }))
          })
        });
        if (!signedUrlResponse.ok) {
          const message = await signedUrlResponse.text();
          throw new Error(message || '写真アップロード用URLの取得に失敗しました');
        }
        const signedUrls = (await signedUrlResponse.json()) as { signedUrls: { path: string; url: string }[] };
        const uploadedPaths = await uploadFilesWithSignedUrls(files, signedUrls.signedUrls);

        const finalizeResponse = await fetch(`/api/visit/${visitId}/finalize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths: uploadedPaths })
        });
        if (!finalizeResponse.ok) {
          const message = await finalizeResponse.text();
          throw new Error(message || '写真の保存に失敗しました');
        }
      }

      onCompleted?.({ visitId });
      onClose();
      setFiles([]);
      reset();
      window.setTimeout(() => {
        window.alert('訪問を登録しました！');
      }, 0);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    }
  });

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="visit-modal" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15,23,42,0.45)',
              zIndex: 200
            }}
          />
        </Transition.Child>
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            padding: '1.5rem',
            zIndex: 210
          }}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel
              style={{
                width: '100%',
                maxWidth: '480px',
                borderRadius: '16px',
                background: '#fff',
                padding: '1.5rem',
                boxShadow: '0 25px 50px -12px rgba(30,64,175,0.25)',
                display: 'grid',
                gap: '1rem'
              }}
            >
              <Dialog.Title style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {place ? `${place.name} を訪問` : '訪問記録を追加'}
              </Dialog.Title>
              <form onSubmit={onSubmit} style={{ display: 'grid', gap: '1rem' }}>
                <label style={{ display: 'grid', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>訪問日</span>
                  <input
                    type="date"
                    {...register('visited_at')}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5f5'
                    }}
                  />
                </label>
                <label style={{ display: 'grid', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>メモ</span>
                  <textarea
                    rows={3}
                    {...register('note')}
                    placeholder="巡礼の記録や感想を残しましょう"
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5f5',
                      resize: 'vertical'
                    }}
                  />
                </label>
                <label style={{ display: 'grid', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>写真 (最大10枚)</span>
                  <input type="file" accept="image/*" multiple onChange={handleFileChange} />
                </label>
                {files.length > 0 && (
                  <ul
                    style={{
                      listStyle: 'none',
                      margin: 0,
                      padding: 0,
                      display: 'grid',
                      gap: '0.5rem',
                      maxHeight: '160px',
                      overflowY: 'auto'
                    }}
                  >
                    {files.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.85rem',
                          background: '#f9fafb',
                          borderRadius: '8px',
                          padding: '0.5rem 0.75rem'
                        }}
                      >
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          削除
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {error && (
                  <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</p>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      border: '1px solid #d1d5db',
                      background: '#fff',
                      color: '#1f2933',
                      padding: '0.5rem 1.25rem',
                      borderRadius: '999px',
                      cursor: 'pointer'
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      border: 'none',
                      background: '#2563eb',
                      color: '#fff',
                      padding: '0.5rem 1.5rem',
                      borderRadius: '999px',
                      cursor: 'pointer',
                      opacity: isSubmitting ? 0.7 : 1
                    }}
                  >
                    {isSubmitting ? '保存中…' : '保存する'}
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

export default VisitModal;
