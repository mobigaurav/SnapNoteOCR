import { Platform } from 'react-native';
import TextRecognition from '@react-native-ml-kit/text-recognition';

export function cleanOcrText(input: string): string {
  let t = (input ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  t = t.replace(/\u00A0/g, ' ');
  t = t.split('\n').map((line) => line.trimEnd()).join('\n');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

export async function recognizeTextFromImagePath(imagePath: string): Promise<string> {
  const normalized =
    Platform.OS === 'android' && !imagePath.startsWith('file://')
      ? `file://${imagePath}`
      : imagePath;

  const result = await TextRecognition.recognize(normalized);
  return cleanOcrText(result?.text ?? '');
}
