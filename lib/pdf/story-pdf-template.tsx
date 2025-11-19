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
    padding: 40,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FF',
  },
  brandingHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  logo: {
    width: 40,
    height: 40,
  },
  brandName: {
    fontSize: 20,
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#667eea',
  },
  trademark: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#667eea',
  },
  coverContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  coverImage: {
    width: '100%',
    maxWidth: 400,
    height: 400,
    objectFit: 'contain',
    marginBottom: 30,
    borderRadius: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 20,
  },
  modeBadge: {
    backgroundColor: '#8B5CF6',
    color: '#FFFFFF',
    padding: '8 16',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  characters: {
    marginTop: 20,
    textAlign: 'center',
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
  metadata: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  metadataText: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
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
    generation_metadata: {
      mode: 'fun' | 'growth';
      genre_display?: string;
      tone_display?: string;
      length_display?: string;
      growth_topic_display?: string;
      moral?: string;
      paragraphs?: string[];
    };
    story_illustrations?: Array<{
      type: string;
      url: string;
    }>;
    content_characters?: Array<{
      character_profiles: {
        name: string;
      };
    }>;
  };
}

export const StoryPDFTemplate: React.FC<StoryPDFTemplateProps> = ({ story }) => {
  // Get paragraphs
  const paragraphs = story.generation_metadata.paragraphs || story.body.split('\n\n').filter(p => p.trim());

  // Get cover illustration
  const coverIllustration = story.story_illustrations?.find(ill => ill.type === 'scene_0');

  // Get scene illustrations (scene_1 through scene_8)
  const sceneIllustrations = story.story_illustrations?.filter(ill => ill.type !== 'scene_0') || [];

  // Get character names
  const characters = story.content_characters?.map(cc => cc.character_profiles.name) || [];

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

        <View style={styles.modeBadge}>
          <Text>{story.generation_metadata.mode === 'growth' ? 'Growth Story' : 'Fun Story'}</Text>
        </View>

        {characters.length > 0 && (
          <View style={styles.characters}>
            <Text style={styles.charactersLabel}>Featuring</Text>
            <Text style={styles.characterName}>{characters.join(' & ')}</Text>
          </View>
        )}

        <View style={styles.metadata}>
          {story.generation_metadata.genre_display && (
            <Text style={styles.metadataText}>Genre: {story.generation_metadata.genre_display}</Text>
          )}
          {story.generation_metadata.tone_display && (
            <Text style={styles.metadataText}>Tone: {story.generation_metadata.tone_display}</Text>
          )}
          {story.generation_metadata.length_display && (
            <Text style={styles.metadataText}>Length: {story.generation_metadata.length_display}</Text>
          )}
          {story.generation_metadata.growth_topic_display && (
            <Text style={styles.metadataText}>Topic: {story.generation_metadata.growth_topic_display}</Text>
          )}
          <Text style={styles.metadataText}>Created: {formattedDate}</Text>
        </View>
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

        {/* Moral Section (for growth mode) */}
        {story.generation_metadata.mode === 'growth' && story.generation_metadata.moral && (
          <View style={styles.moralSection}>
            <Text style={styles.moralTitle}>✨ Lesson Learned</Text>
            <Text style={styles.moralText}>{story.generation_metadata.moral}</Text>
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
