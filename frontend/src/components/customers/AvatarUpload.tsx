'use client';

import { App, Avatar, Button, Upload } from 'antd';
import { CameraOutlined } from '@ant-design/icons';
import { useUpdateCustomer } from '@/hooks/useSales';
import { ApiClientError } from '@/lib/api-client';
import { colors } from '@/theme/colors';

/** Read an image File and resize it down to a compact JPEG data URL. */
function readResized(file: File, max = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a valid image'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas is not supported'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

interface AvatarUploadProps {
  customerId: string;
  name: string;
  avatarUrl: string | null;
}

/** Customer profile photo with an inline upload (resized & stored as a data URL). */
export default function AvatarUpload({ customerId, name, avatarUrl }: AvatarUploadProps) {
  const { message } = App.useApp();
  const updateCustomer = useUpdateCustomer(customerId);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('Please choose an image file');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      message.error('Image must be under 8 MB');
      return;
    }
    try {
      const dataUrl = await readResized(file);
      await updateCustomer.mutateAsync({ avatarUrl: dataUrl });
      message.success('Profile photo updated');
    } catch (e) {
      message.error(e instanceof ApiClientError ? e.message : 'Could not update the photo');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <Avatar
        size={88}
        src={avatarUrl || undefined}
        style={{ backgroundColor: colors.gold.primary, color: colors.text.onGold, fontSize: 34 }}
      >
        {name.charAt(0).toUpperCase()}
      </Avatar>
      <Upload
        showUploadList={false}
        accept="image/*"
        beforeUpload={(file) => {
          void handleFile(file);
          return false;
        }}
      >
        <Button size="small" icon={<CameraOutlined />} loading={updateCustomer.isPending}>
          {avatarUrl ? 'Change photo' : 'Upload photo'}
        </Button>
      </Upload>
    </div>
  );
}
