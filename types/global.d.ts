import { MongooseError } from 'mongoose';

declare global {
  var mongoose: {
    conn: typeof import('mongoose') | null;
    promise: Promise<typeof import('mongoose')> | null;
  };
}

// CSS modules support
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}