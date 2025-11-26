export interface StoryData {
  image_url: string | null;
  generated_image_prompt: string;
  title: string;
  paragraphs: string[];
  source: string;
}

export interface ProcessingState {
  isLoading: boolean;
  step: 'idle' | 'analyzing' | 'generating_image' | 'complete' | 'error';
  error?: string;
}
