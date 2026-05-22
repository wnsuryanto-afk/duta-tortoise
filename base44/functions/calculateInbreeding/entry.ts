import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tortoiseId } = await req.json();
    
    if (!tortoiseId) {
      return Response.json({ error: 'tortoiseId is required' }, { status: 400 });
    }

    // Get all tortoises to build pedigree
    const allTortoises = await base44.entities.Tortoise.list();
    const tortoise = allTortoises.find(t => t.id === tortoiseId);
    
    if (!tortoise) {
      return Response.json({ error: 'Tortoise not found' }, { status: 404 });
    }

    // Build pedigree tree (3 generations)
    const getAncestors = (t, generation = 0) => {
      if (generation >= 3 || !t) return [];
      
      const ancestors = [];
      if (t.parent_male) {
        const father = allTortoises.find(t2 => t2.code === t.parent_male || t2.name === t.parent_male);
        if (father) {
          ancestors.push({ ...father, generation: generation + 1, side: 'male' });
          ancestors.push(...getAncestors(father, generation + 1));
        }
      }
      if (t.parent_female) {
        const mother = allTortoises.find(t2 => t2.code === t.parent_female || t2.name === t.parent_female);
        if (mother) {
          ancestors.push({ ...mother, generation: generation + 1, side: 'female' });
          ancestors.push(...getAncestors(mother, generation + 1));
        }
      }
      return ancestors;
    };

    const ancestors = getAncestors(tortoise);
    
    // Calculate inbreeding coefficient using Wright's method
    // F = Σ(0.5)^(n1+n2+1) * (1 + FA)
    // where n1 and n2 are generations from parents to common ancestor
    
    const inbreedingCoefficients = {};
    
    // For each potential mate, calculate coefficient
    const potentialMates = allTortoises.filter(t => 
      t.id !== tortoiseId && 
      t.gender !== tortoise.gender &&
      t.status === 'aktif' &&
      t.is_proven
    );

    const results = potentialMates.map(mate => {
      const mateAncestors = getAncestors(mate);
      
      // Find common ancestors
      const tortoiseAncestorIds = new Set(ancestors.map(a => a.id));
      const commonAncestors = mateAncestors.filter(a => tortoiseAncestorIds.has(a.id));
      
      // Calculate coefficient
      let coefficient = 0;
      commonAncestors.forEach(ancestor => {
        const n1 = ancestors.find(a => a.id === ancestor.id)?.generation || 0;
        const n2 = mateAncestors.find(a => a.id === ancestor.id)?.generation || 0;
        coefficient += Math.pow(0.5, n1 + n2 + 1);
      });
      
      const percentage = coefficient * 100;
      
      let riskLevel = 'aman';
      let riskColor = 'green';
      if (percentage >= 25) {
        riskLevel = 'tidak_disarankan';
        riskColor = 'red';
      } else if (percentage >= 12.5) {
        riskLevel = 'perhatian';
        riskColor = 'yellow';
      } else if (percentage >= 6.25) {
        riskLevel = 'aman_dengan_perhatian';
        riskColor = 'light-green';
      }

      return {
        mate_id: mate.id,
        mate_name: mate.name,
        mate_code: mate.code,
        mate_photo_url: mate.photo_url,
        mate_morph: mate.morph,
        inbreeding_coefficient: percentage,
        risk_level: riskLevel,
        risk_color: riskColor,
        common_ancestor_count: commonAncestors.length
      };
    });

    // Sort by lowest inbreeding coefficient
    results.sort((a, b) => a.inbreeding_coefficient - b.inbreeding_coefficient);

    return Response.json({
      tortoise: {
        id: tortoise.id,
        name: tortoise.name,
        code: tortoise.code,
        gender: tortoise.gender,
        morph: tortoise.morph,
        parent_male: tortoise.parent_male,
        parent_female: tortoise.parent_female
      },
      recommendations: results,
      total_ancestors_found: ancestors.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});