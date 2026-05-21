'use client';

import { Button, Card, Col, ColorPicker, Popconfirm, Row, Space, Tag, Typography } from 'antd';
import { CheckCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Color } from 'antd/es/color-picker';
import { useThemeStore, type ThemeTokens, DEFAULT_TOKENS } from '@/store/themeStore';
import { useBrandColors } from '@/hooks/useBrandColors';

const { Title, Text } = Typography;

/**
 * Each editable token grouped by category, so the settings UI is organised
 * the same way the palette is conceptually structured.
 */
interface TokenField {
  key: keyof ThemeTokens;
  label: string;
  hint: string;
}

interface TokenGroup {
  title: string;
  description: string;
  fields: TokenField[];
}

const groups: TokenGroup[] = [
  {
    title: 'Brand',
    description: 'The accent colour used by primary buttons, selected menu items and brand text.',
    fields: [
      { key: 'brandPrimary', label: 'Primary', hint: 'Main accent (default: gold)' },
      { key: 'brandSecondary', label: 'Secondary', hint: 'Focus rings, badges' },
      { key: 'brandLight', label: 'Light', hint: 'Subtle accents, disabled state' },
      { key: 'brandDark', label: 'Dark', hint: 'Pressed states, visited links' },
      { key: 'textOnBrand', label: 'Text on brand', hint: 'Foreground when sitting on brand fill' },
    ],
  },
  {
    title: 'Background',
    description: 'Page, card and elevated surface backgrounds.',
    fields: [
      { key: 'bgPrimary', label: 'Primary', hint: 'Main page background' },
      { key: 'bgSecondary', label: 'Secondary', hint: 'Cards, sidebar, header' },
      { key: 'bgTertiary', label: 'Tertiary', hint: 'Hover states, form inputs' },
    ],
  },
  {
    title: 'Text',
    description: 'Foreground text colours across the app.',
    fields: [
      { key: 'textPrimary', label: 'Primary', hint: 'Headings and body text' },
      { key: 'textSecondary', label: 'Secondary', hint: 'Subtler body text' },
      { key: 'textPlaceholder', label: 'Placeholder', hint: 'Form placeholders, captions' },
    ],
  },
  {
    title: 'Border',
    description: 'Divider lines and borders.',
    fields: [{ key: 'border', label: 'Border', hint: 'Cards, table rows, sidebar edge' }],
  },
  {
    title: 'Status',
    description: 'Alert, tag and status indicator colours.',
    fields: [
      { key: 'statusSuccess', label: 'Success', hint: 'Successful actions' },
      { key: 'statusWarning', label: 'Warning', hint: 'Cautions, pending states' },
      { key: 'statusError', label: 'Error', hint: 'Failures, destructive actions' },
      { key: 'statusInfo', label: 'Info', hint: 'Informational messages' },
    ],
  },
];

export default function AdminSettingsPage() {
  const tokens = useThemeStore((s) => s.tokens);
  const setToken = useThemeStore((s) => s.setToken);
  const reset = useThemeStore((s) => s.reset);
  const colors = useBrandColors();

  const handleChange = (key: keyof ThemeTokens) => (color: Color) => {
    setToken(key, color.toHexString());
  };

  const isDirty = (Object.keys(DEFAULT_TOKENS) as (keyof ThemeTokens)[]).some(
    (k) => tokens[k] !== DEFAULT_TOKENS[k],
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={3} style={{ color: colors.text.primary, marginBottom: 4 }}>
            Appearance
          </Title>
          <Text style={{ color: colors.text.placeholder }}>
            Customise the theme palette. Changes save instantly to your browser and apply across
            both the admin and employee sides.
          </Text>
        </div>
        <Popconfirm
          title="Reset all theme colours to the default Black & Gold palette?"
          onConfirm={reset}
          okText="Reset"
          cancelText="Cancel"
          disabled={!isDirty}
        >
          <Button icon={<ReloadOutlined />} disabled={!isDirty}>
            Reset to defaults
          </Button>
        </Popconfirm>
      </div>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        {/* --- Editors --- */}
        <Col xs={24} lg={14}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {groups.map((group) => (
              <Card
                key={group.title}
                title={group.title}
                style={{ background: colors.black.secondary, border: `1px solid ${colors.border}` }}
                styles={{ header: { borderBottom: `1px solid ${colors.border}` } }}
              >
                <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
                  {group.description}
                </Text>
                <div style={{ marginTop: 12 }}>
                  {group.fields.map((field) => {
                    const value = tokens[field.key];
                    const isCustom = value !== DEFAULT_TOKENS[field.key];
                    return (
                      <Row
                        key={field.key}
                        align="middle"
                        gutter={12}
                        style={{ padding: '8px 0', borderTop: `1px solid ${colors.border}` }}
                      >
                        <Col flex="auto">
                          <Text style={{ color: colors.text.primary, fontSize: 13 }}>
                            {field.label}{' '}
                            {isCustom && (
                              <Tag color="gold" style={{ marginLeft: 4 }}>
                                custom
                              </Tag>
                            )}
                          </Text>
                          <div>
                            <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>
                              {field.hint}
                            </Text>
                          </div>
                        </Col>
                        <Col>
                          <Text
                            code
                            style={{ color: colors.text.secondary, fontSize: 11, marginRight: 8 }}
                          >
                            {value}
                          </Text>
                          <ColorPicker
                            value={value}
                            format="hex"
                            showText
                            onChange={handleChange(field.key)}
                          />
                        </Col>
                      </Row>
                    );
                  })}
                </div>
              </Card>
            ))}
          </Space>
        </Col>

        {/* --- Live preview --- */}
        <Col xs={24} lg={10}>
          <Card
            title="Live preview"
            style={{
              background: colors.black.secondary,
              border: `1px solid ${colors.border}`,
              position: 'sticky',
              top: 24,
            }}
            styles={{ header: { borderBottom: `1px solid ${colors.border}` } }}
          >
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <div>
                <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>BUTTONS</Text>
                <div style={{ marginTop: 8 }}>
                  <Space>
                    <Button type="primary">Primary</Button>
                    <Button>Default</Button>
                    <Button danger>Danger</Button>
                  </Space>
                </div>
              </div>

              <div>
                <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>BRAND TILE</Text>
                <div
                  style={{
                    marginTop: 8,
                    padding: 16,
                    borderRadius: 8,
                    background: colors.black.secondary,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      background: colors.gold.primary,
                      color: colors.text.onGold,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      marginBottom: 12,
                    }}
                  >
                    <CheckCircleOutlined />
                  </div>
                  <Text strong style={{ color: colors.text.primary, fontSize: 15 }}>
                    Sample Module
                  </Text>
                  <div>
                    <Text style={{ color: colors.text.placeholder, fontSize: 12 }}>
                      How a sidebar tile looks with the current palette.
                    </Text>
                  </div>
                </div>
              </div>

              <div>
                <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>STATUS TAGS</Text>
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    <Tag color={colors.status.success}>Success</Tag>
                    <Tag color={colors.status.warning}>Warning</Tag>
                    <Tag color={colors.status.error}>Error</Tag>
                    <Tag color={colors.status.info}>Info</Tag>
                  </Space>
                </div>
              </div>

              <div>
                <Text style={{ color: colors.text.placeholder, fontSize: 11 }}>BRAND TEXT</Text>
                <div style={{ marginTop: 8 }}>
                  <span
                    style={{
                      color: colors.gold.primary,
                      fontWeight: 700,
                      letterSpacing: 4,
                      fontSize: 22,
                    }}
                  >
                    WELONA
                  </span>
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
