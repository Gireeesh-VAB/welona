'use client';

import { Empty, Tag, Timeline, Typography } from 'antd';
import StatusTag from '@/components/sales/StatusTag';
import { formatDate, titleCase } from '@shared/format';
import type { FollowUp } from '@shared/types/sales';
import { colors } from '@/theme/colors';

const { Text } = Typography;

/** Timeline dot colour by follow-up status. */
const DOT_COLOR: Record<string, string> = {
  pending: 'blue',
  completed: 'green',
  cancelled: 'gray',
};

/** Classify a next-follow-up date for colour-coding. */
function dueTone(dueAt: string): { color: string; label: string } {
  const due = new Date(dueAt);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  if (startOfDue < startOfToday) return { color: colors.status.error, label: 'Overdue' };
  if (startOfDue === startOfToday) return { color: colors.gold.primary, label: 'Today' };
  return { color: colors.text.secondary, label: '' };
}

export interface FollowUpTimelineProps {
  items: FollowUp[];
  /** Used to resolve `assignedToId` to a readable staff name. */
  staff?: Array<{ id: string; name: string }>;
  emptyText?: string;
}

/**
 * Renders a follow-up interaction history as a vertical timeline — shared by
 * the Enquiry Details page and the Customer Profile Follow-Ups tab.
 */
export default function FollowUpTimeline({
  items,
  staff = [],
  emptyText = 'No follow-ups logged yet',
}: FollowUpTimelineProps) {
  if (items.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />;
  }

  const staffName = (id: string | null) => staff.find((s) => s.id === id)?.name;

  return (
    <Timeline
      items={items.map((f) => {
        const tone = f.dueAt ? dueTone(f.dueAt) : null;
        return {
          color: DOT_COLOR[f.status] ?? 'blue',
          children: (
            <div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Text strong>
                  Contacted {formatDate(f.contactedAt ?? f.createdAt)}
                </Text>
                <StatusTag status={f.status} />
                {f.outcome && <Tag color="purple">{titleCase(f.outcome)}</Tag>}
              </div>

              {f.note && (
                <Text style={{ display: 'block', marginTop: 4 }}>{f.note}</Text>
              )}
              {f.remarks && (
                <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
                  Remarks: {f.remarks}
                </Text>
              )}

              <div style={{ marginTop: 6, fontSize: 12 }}>
                {staffName(f.assignedToId) && (
                  <Text type="secondary" style={{ marginRight: 12 }}>
                    Assigned: {staffName(f.assignedToId)}
                  </Text>
                )}
                {f.dueAt && tone && (
                  <Text style={{ color: tone.color }}>
                    Next follow-up: {formatDate(f.dueAt)}
                    {tone.label && ` · ${tone.label}`}
                  </Text>
                )}
              </div>
            </div>
          ),
        };
      })}
    />
  );
}
