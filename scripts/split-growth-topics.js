const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iolimejvugpcpnmruqww.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvbGltZWp2dWdwY3BubXJ1cXd3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM3NDA5NCwiZXhwIjoyMDc3OTUwMDk0fQ.ybv7KgWy0fdRTik1UkX3nAjdgLsBEExpLUrvnG2FRMA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function splitGrowthTopics() {
  console.log('Starting to split growth topics...\n');

  // 1. Update the original "biting_hitting_pushing" to just "No Biting"
  console.log('1. Updating biting topic...');
  const { error: updateBiting } = await supabase
    .from('story_parameters')
    .update({
      name: 'no_biting',
      display_name: 'No Biting',
      description: 'Using gentle mouth and teeth',
      metadata: {
        category: 'Self-Control & Habits',
        category_name: 'self_control_habits',
        prompt_guidance: 'Create a story where the character feels very frustrated and wants to bite but learns to use gentle mouth and words instead. Show the trigger, the feeling, the better choice, and the positive result. Teach "use your words" and give specific alternatives to biting.'
      }
    })
    .eq('id', '46bcfbdb-514c-425f-a943-6149e675a5ef');

  if (updateBiting) {
    console.error('Error updating biting topic:', updateBiting);
    return;
  }
  console.log('✓ Updated biting topic');

  // 2. Create new "No Hitting or Pushing" topic
  console.log('\n2. Creating hitting/pushing topic...');
  const { error: insertHitting } = await supabase
    .from('story_parameters')
    .insert({
      type: 'growth_topic',
      name: 'no_hitting_pushing',
      display_name: 'No Hitting or Pushing',
      description: 'Using gentle hands',
      metadata: {
        category: 'Self-Control & Habits',
        category_name: 'self_control_habits',
        prompt_guidance: 'Create a story where the character feels very frustrated and wants to hit or push but learns to use gentle hands and words instead. Show the trigger, the feeling, the better choice, and the positive result. Teach "use your words" and give specific alternatives to physical aggression.'
      },
      is_active: true,
      display_order: 201
    });

  if (insertHitting) {
    console.error('Error creating hitting/pushing topic:', insertHitting);
    return;
  }
  console.log('✓ Created hitting/pushing topic');

  // 3. Update the original "interrupting_yelling" to just "Not Interrupting"
  console.log('\n3. Updating interrupting topic...');
  const { error: updateInterrupting } = await supabase
    .from('story_parameters')
    .update({
      name: 'not_interrupting',
      display_name: 'Not Interrupting',
      description: 'Waiting for turns to talk',
      metadata: {
        category: 'Self-Control & Habits',
        category_name: 'self_control_habits',
        prompt_guidance: 'Create a story where the character is very excited and wants to talk RIGHT NOW, but learns to wait their turn. Show the importance of listening to others and how conversation works. Make waiting feel manageable and worthwhile.'
      }
    })
    .eq('id', '0656c6c5-e504-496e-99f3-954e958e0fbb');

  if (updateInterrupting) {
    console.error('Error updating interrupting topic:', updateInterrupting);
    return;
  }
  console.log('✓ Updated interrupting topic');

  // 4. Create new "No Yelling or Screaming" topic
  console.log('\n4. Creating yelling/screaming topic...');
  const { error: insertYelling } = await supabase
    .from('story_parameters')
    .insert({
      type: 'growth_topic',
      name: 'no_yelling_screaming',
      display_name: 'No Yelling or Screaming',
      description: 'Using an inside voice',
      metadata: {
        category: 'Self-Control & Habits',
        category_name: 'self_control_habits',
        prompt_guidance: 'Create a story where the character is very excited or upset and wants to yell or scream, but learns to use an inside voice. Show the importance of using calm words even when feeling big emotions. Make using a quiet voice feel like a grown-up skill.'
      },
      is_active: true,
      display_order: 202
    });

  if (insertYelling) {
    console.error('Error creating yelling/screaming topic:', insertYelling);
    return;
  }
  console.log('✓ Created yelling/screaming topic');

  // Verify the changes
  console.log('\n5. Verifying changes...');
  const { data: verifyData, error: verifyError } = await supabase
    .from('story_parameters')
    .select('*')
    .eq('type', 'growth_topic')
    .in('name', ['no_biting', 'no_hitting_pushing', 'not_interrupting', 'no_yelling_screaming'])
    .order('display_order');

  if (verifyError) {
    console.error('Error verifying:', verifyError);
    return;
  }

  console.log('\n✓ All changes completed successfully!');
  console.log('\nNew topics:');
  verifyData.forEach(topic => {
    console.log(`  - ${topic.display_name} (${topic.name})`);
  });
}

splitGrowthTopics();
