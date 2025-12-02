import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// Register fonts (using system fonts for now)
Font.register({
  family: 'Inter',
  src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2',
});

// Define styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Inter',
    fontSize: 12,
    lineHeight: 1.6,
    backgroundColor: '#FFFFFF',
  },
  coverPage: {
    padding: 30,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  brandingHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  logo: {
    width: 40,
    height: 40,
  },
  brandName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0c8ce9',
  },
  trademark: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0c8ce9',
  },
  coverContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flex: 1,
    width: '100%',
  },
  coverImage: {
    width: '100%',
    maxWidth: 400,
    height: 400,
    objectFit: 'contain',
    marginBottom: 20,
    borderRadius: 8,
    alignSelf: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 15,
    width: '100%',
    alignSelf: 'center',
  },
  characters: {
    marginTop: 15,
    textAlign: 'center',
    width: '100%',
    alignSelf: 'center',
  },
  charactersLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  characterName: {
    fontSize: 14,
    color: '#374151',
    fontWeight: 'bold',
  },
  coverDate: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 15,
    textAlign: 'center',
    width: '100%',
    alignSelf: 'center',
  },
  contentPage: {
    padding: 40,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 1.8,
    color: '#374151',
    marginBottom: 16,
    textAlign: 'justify',
  },
  sceneImage: {
    width: '100%',
    maxHeight: 300,
    objectFit: 'contain',
    marginVertical: 20,
    borderRadius: 8,
  },
  moralSection: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    border: '2 solid #F59E0B',
  },
  moralTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 10,
  },
  moralText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 1.6,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    borderTop: '1 solid #E5E7EB',
    paddingTop: 10,
  },
  pageNumber: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 10,
  },
});

interface StoryPDFTemplateProps {
  story: {
    title: string;
    body: string;
    created_at: string;
    engine_version?: string;
    // Database fields for both Beta and Legacy stories
    story_text?: string;
    paragraphs?: string[];
    moral?: string;
    generation_metadata: {
      mode: 'fun' | 'growth';
      genre_display?: string;
      tone_display?: string;
      length_display?: string;
      growth_topic_display?: string;
      moral?: string;
      paragraphs?: string[];
      characters?: Array<{
        character_profile_id?: string | null;
        character_name?: string;
        name?: string;
        profile_type?: string | null;
      }>;
    };
    // V3 illustration status
    v3_illustration_status?: {
      overall: string;
      cover: {
        status: string;
        imageUrl?: string;
        tempUrl?: string;
      };
      scenes: Array<{
        paragraphIndex: number;
        status: string;
        imageUrl?: string;
        tempUrl?: string;
      }>;
    };
    // Deprecated - kept for backward compatibility with old stories
    content_characters?: Array<{
      character_profiles: {
        name: string;
      };
    }>;
  };
}

export const StoryPDFTemplate: React.FC<StoryPDFTemplateProps> = ({ story }) => {
  // Check story type
  const isV3Story = story.engine_version === 'v3' || !!story.v3_illustration_status;

  // Get paragraphs from generation_metadata (V3 format)
  const paragraphs = story.generation_metadata?.paragraphs ||
    story.paragraphs ||
    story.story_text?.split('\n\n').filter((p: string) => p.trim()) ||
    [];

  // Get cover illustration - V3 format (prefer imageUrl, fallback to tempUrl)
  const v3Cover = story.v3_illustration_status?.cover;
  const coverIllustration = isV3Story && (v3Cover?.imageUrl || v3Cover?.tempUrl)
    ? { url: (v3Cover.imageUrl || v3Cover.tempUrl)!, type: 'cover' }
    : null;

  // Get scene illustrations - V3 format (prefer imageUrl, fallback to tempUrl)
  const sceneIllustrations = isV3Story && story.v3_illustration_status?.scenes
    ? story.v3_illustration_status.scenes
        .filter(scene => scene.imageUrl || scene.tempUrl)
        .map(scene => ({
          type: `scene_${scene.paragraphIndex + 1}`,
          url: (scene.imageUrl || scene.tempUrl)!
        }))
    : [];

  // Get character names - use generation_metadata.characters if available, fallback to content_characters
  const characters = story.generation_metadata?.characters?.map((c: any) => c.character_name || c.name) ||
    story.content_characters?.map((cc: any) => cc.character_profiles.name) ||
    [];

  // Get moral if available
  const moral = story.moral || story.generation_metadata?.moral;

  // Format date
  const formattedDate = new Date(story.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.coverPage}>
        {/* Branding Header */}
        <View style={styles.brandingHeader}>
          <Image
            src="https://tuckandtale.com/images/logo.png"
            style={styles.logo}
          />
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 2 }}>
            <Text style={styles.brandName}>Tuck and Tale</Text>
            <Text style={styles.trademark}>™</Text>
          </View>
        </View>

        {/* Cover Content */}
        <View style={styles.coverContent}>
          {coverIllustration && (
            <Image
              src={coverIllustration.url}
              style={styles.coverImage}
            />
          )}

          <Text style={styles.title}>{story.title}</Text>

          {characters.length > 0 && (
            <View style={styles.characters}>
              <Text style={styles.charactersLabel}>Featuring</Text>
              <Text style={styles.characterName}>{characters.join(' & ')}</Text>
            </View>
          )}

          <Text style={styles.coverDate}>Created: {formattedDate}</Text>
        </View>

        <Text style={styles.footer}>
          tuckandtale.com
        </Text>
      </Page>

      {/* Story Content Pages */}
      <Page size="A4" style={styles.contentPage}>
        {paragraphs.map((paragraph, index) => {
          // Find matching scene illustration (if any)
          const sceneIllustration = sceneIllustrations.find(
            ill => ill.type === `scene_${index + 1}`
          );

          return (
            <View key={index}>
              {sceneIllustration && (
                <Image
                  src={sceneIllustration.url}
                  style={styles.sceneImage}
                />
              )}
              <Text style={styles.paragraph}>{paragraph}</Text>
            </View>
          );
        })}

        {/* Moral Section (for growth mode or any story with moral) */}
        {moral && (
          <View style={styles.moralSection}>
            <Text style={styles.moralTitle}>Lesson Learned</Text>
            <Text style={styles.moralText}>{moral}</Text>
          </View>
        )}

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
};
