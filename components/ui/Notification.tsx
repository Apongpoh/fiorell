import { motion } from 'framer-motion';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface NotificationProps {
  id: string;
  type: 'success' | 'error';
  message: string;
  onClose: (id: string) => void;
}

export const Notification = ({ id, type, message, onClose }: NotificationProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`flex items-center gap-3 p-4 rounded-lg shadow-lg ${
        type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
      }`}
    >
      {type === 'success' ? (
        <CheckCircle className="w-5 h-5 text-green-500" />
      ) : (
        <XCircle className="w-5 h-5 text-red-500" />
      )}
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="text-gray-500 hover:text-gray-700"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};