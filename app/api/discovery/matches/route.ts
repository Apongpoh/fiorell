import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import Like from '@/models/Like';
import { verifyAuth } from '@/lib/auth';

// Get potential matches for discovery
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Verify authentication
    const { userId } = verifyAuth(request);

    // Get current user to access their preferences
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = parseInt(searchParams.get('offset') || '0');
  const minAge = searchParams.get('minAge');
  const maxAge = searchParams.get('maxAge');
  const gender = searchParams.get('gender');
  const verifiedOnly = searchParams.get('verifiedOnly') === 'true';
  const interestsParam = searchParams.get('interests');
  const maxDistance = searchParams.get('maxDistance');
  const diagnostics = searchParams.get('diag') === '1';

    // Build filter based on user preferences
    const filter: any = {
      _id: { $ne: userId }, // Exclude current user
      isActive: true
    };

    // Gender priority: explicit query overrides stored preference
    const effectiveGender = gender && gender !== 'all' ? gender : (currentUser.preferences?.genderPreference && currentUser.preferences.genderPreference !== 'all' ? currentUser.preferences.genderPreference : null);
    if (effectiveGender) {
      filter.gender = effectiveGender;
    }

    // Filter by age range
    const ageRange = {
      min: minAge ? parseInt(minAge) : currentUser.preferences?.ageRange?.min,
      max: maxAge ? parseInt(maxAge) : currentUser.preferences?.ageRange?.max,
    };
    if (ageRange.min && ageRange.max) {
      const currentYear = new Date().getFullYear();
      const minBirthYear = currentYear - ageRange.max; // older
      const maxBirthYear = currentYear - ageRange.min; // younger
      filter.dateOfBirth = {
        $gte: new Date(minBirthYear, 0, 1),
        $lte: new Date(maxBirthYear, 11, 31)
      };
    }

    // Verified only
    if (verifiedOnly) {
      filter['verification.isVerified'] = true;
    }

    // Build interest filter object separately so we can merge $in/$all/$nin safely
    const interestFilter: any = {};
    if (interestsParam) {
      const interests = interestsParam.split(',').map(i => i.trim()).filter(Boolean);
      if (interests.length) {
        interestFilter.$in = interests;
      }
    }

    // Apply user deal breakers (server-side hard constraints)
    const dealBreakers = currentUser.preferences?.dealBreakers;
    if (dealBreakers) {
      // Require verified profiles only
      if (dealBreakers.requireVerified) {
        filter['verification.isVerified'] = true;
      }
      // Candidate must include ALL of mustHaveInterests
      if (Array.isArray(dealBreakers.mustHaveInterests) && dealBreakers.mustHaveInterests.length) {
        interestFilter.$all = dealBreakers.mustHaveInterests;
      }
      // Candidate must include NONE of excludeInterests
      if (Array.isArray(dealBreakers.excludeInterests) && dealBreakers.excludeInterests.length) {
        interestFilter.$nin = dealBreakers.excludeInterests;
      }
      // Lifestyle exclusions
      if (Array.isArray(dealBreakers.excludeSmoking) && dealBreakers.excludeSmoking.length) {
        filter['lifestyle.smoking'] = { $nin: dealBreakers.excludeSmoking };
      }
      if (Array.isArray(dealBreakers.excludeMaritalStatuses) && dealBreakers.excludeMaritalStatuses.length) {
        filter['lifestyle.maritalStatus'] = { $nin: dealBreakers.excludeMaritalStatuses };
      }
      if (dealBreakers.requireHasKids === true) {
        filter['lifestyle.hasKids'] = true;
      } else if (dealBreakers.requireHasKids === false) {
        filter['lifestyle.hasKids'] = { $in: [false, null] };
      }
    }

    // Distance filtering (if user + candidate have coordinates)
    if (maxDistance && currentUser.location?.coordinates?.length === 2) {
      const distKm = parseInt(maxDistance);
      if (!isNaN(distKm) && distKm > 0) {
        filter['location.coordinates'] = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: currentUser.location.coordinates // [lng, lat]
            },
            $maxDistance: distKm * 1000
          }
        };
      }
    }

    // Get users who haven't been liked/passed by current user
    const existingInteractions = await Like.find({ 
      fromUserId: userId 
    }).select('toUserId');
    
    const interactedUserIds = existingInteractions.map(like => like.toUserId);
    if (interactedUserIds.length > 0) {
      filter._id = { ...filter._id, $nin: interactedUserIds };
    }

    // Resolve interest filter conflicts (intersection between $all and $nin makes query unsatisfiable)
    if (interestFilter.$all && interestFilter.$nin) {
      const conflicts = interestFilter.$all.filter((x: string) => interestFilter.$nin.includes(x));
      if (conflicts.length) {
        // Remove conflicting values from $nin first (more user-friendly: still enforce must-have)
        interestFilter.$nin = interestFilter.$nin.filter((x: string) => !conflicts.includes(x));
        // If $nin emptied, delete it
        if (Array.isArray(interestFilter.$nin) && interestFilter.$nin.length === 0) delete interestFilter.$nin;
      }
    }

    if (Object.keys(interestFilter).length) {
      filter.interests = { ...(filter.interests || {}), ...interestFilter };
    }

    // Optionally gather baseline (for diagnostics or zero-result fallback)
    let baselineCount: number | undefined;
    if (diagnostics) {
      baselineCount = await User.countDocuments({ _id: { $ne: userId }, isActive: true });
    }

    // Execute main query
    let users = await User.find(filter)
      .select('firstName dateOfBirth location bio interests photos verification lifestyle')
      .skip(offset)
      .limit(limit)
      .lean();

    // If no results and we have strong deal breakers, attempt a relaxed count to help client adjust
    let relaxedCount: number | undefined;
    if (users.length === 0 && dealBreakers) {
      const relaxedFilter = { ...filter } as any;
      // Remove hard deal breaker clauses progressively
      delete relaxedFilter['verification.isVerified']; // from deal breaker requirement
      if (relaxedFilter.interests) {
        // keep $in (soft) but drop $all/$nin deal breaker components
        const { $in } = relaxedFilter.interests;
        if ($in) {
          relaxedFilter.interests = { $in };
        } else {
          delete relaxedFilter.interests;
        }
      }
      delete relaxedFilter['lifestyle.smoking'];
      delete relaxedFilter['lifestyle.maritalStatus'];
      delete relaxedFilter['lifestyle.hasKids'];
      try {
        relaxedCount = await User.countDocuments(relaxedFilter);
      } catch {}
    }

    // Calculate compatibility based on shared interests
    const currentUserInterests = Array.isArray(currentUser.interests) ? currentUser.interests : [];
    const formattedUsers = users.map(user => {
      const candidateInterests = Array.isArray(user.interests) ? user.interests : [];
      const sharedInterests = candidateInterests.filter((interest: string) => currentUserInterests.includes(interest));
      const compatibilityScore = candidateInterests.length > 0
        ? Math.round((sharedInterests.length / candidateInterests.length) * 100)
        : 0;
      return {
        id: user._id,
        firstName: user.firstName,
        age: user.dateOfBirth ? Math.floor((new Date().getTime() - new Date(user.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
        location: user.location,
        bio: user.bio,
        interests: user.interests,
        photos: user.photos,
        verification: user.verification,
        compatibilityScore,
        commonInterests: sharedInterests.slice(0, 3)
      };
    });

    return NextResponse.json(
      {
        matches: formattedUsers,
        hasMore: users.length === limit,
        totalShown: offset + users.length,
        diagnostics: diagnostics ? {
          appliedFilter: filter,
          baselineCount,
          relaxedCount: relaxedCount ?? null,
          dealBreakersApplied: !!dealBreakers
        } : undefined
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  } catch (error: unknown) {
    console.error('Get matches error:', error);

    if (error instanceof Error && (error.message === 'Authentication token is required' || error.message === 'Invalid or expired token')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}