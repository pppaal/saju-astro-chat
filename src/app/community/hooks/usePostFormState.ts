import { useState } from 'react';
import type { MediaType } from '../types';

/**
 * Custom hook for managing post form state
 *
 * @returns Object containing form state, setters, and reset function
 */
export function usePostFormState(): {
  title: string;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  mediaType: MediaType;
  setMediaType: React.Dispatch<React.SetStateAction<MediaType>>;
  url: string;
  setUrl: React.Dispatch<React.SetStateAction<string>>;
  body: string;
  setBody: React.Dispatch<React.SetStateAction<string>>;
  tags: string;
  setTags: React.Dispatch<React.SetStateAction<string>>;
  resetForm: () => void;
} {
  const [title, setTitle] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [url, setUrl] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");

  const resetForm = () => {
    setTitle("");
    setUrl("");
    setBody("");
    setTags("");
  };

  return {
    title,
    setTitle,
    mediaType,
    setMediaType,
    url,
    setUrl,
    body,
    setBody,
    tags,
    setTags,
    resetForm,
  };
}
