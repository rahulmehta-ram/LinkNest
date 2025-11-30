# LinkNest - Quick Test Guide 🧪

## How to Test the New Features

### 1. Test Dark Mode Fix
**URL**: `http://localhost:3000`

**Steps**:
1. Click on the **Portfolio** template (or any template)
2. Create a profile with these settings:
   - Name: "Test Profile"
   - Bio: "Testing dark mode"
   - Theme: **Light** ☀️
   - Background Color: **#1a1a1a** (dark)
   - Button Color: **#667eea**
3. Add any link
4. Click "Create & Share Profile"
5. **Expected**: Profile should display with light theme gradient (NOT dark background)

**Alternative Test**:
1. Same as above but:
   - Theme: **Dark** 🌙
   - Background Color: **#ffffff** (white)
2. **Expected**: Profile should display with dark theme gradient (NOT white background)

---

### 2. Test 40+ Social Media Platforms
**URL**: `http://localhost:3000`

**Steps**:
1. Click any template
2. In the "Your Links" section, click the **Platform dropdown**
3. **Expected Results**:
   - See organized categories (Social Media, Professional, Creative, etc.)
   - Find new platforms: WhatsApp, Telegram, Discord, Patreon, etc.
   - Total of 40+ options available

**Test Icon Display**:
1. Add links for these new platforms:
   - WhatsApp
   - Discord  
   - Telegram
   - Spotify
   - Patreon
2. Submit the form and view the profile
3. **Expected**: Each link shows the correct FontAwesome icon

---

### 3. Profile Display Testing

**After creating a profile with new platforms**:
1. Copy the profile URL (e.g., `http://localhost:3000/p/abc123`)
2. Open it in a new tab/browser
3. **Expected**:
   - Correct theme applied (dark or light)
   - Custom background color only applies if it matches theme
   - All social media icons display correctly
   - Profile is mobile responsive

---

## Quick Verification Commands

### Check Dark Mode Fix
```bash
grep -n "Apply custom background color" public/profile.html
# Should show: line ~715 (dark mode fix applied)
```

### Check Social Media Platforms
```bash
grep "optgroup label" public/index.html
# Should show: 8 categories (Social Media, Professional, Creative, etc.)
```

### Check Icon Mappings
```bash
grep "'discord':" public/profile.html
grep "'whatsapp':" public/profile.html
grep "'telegram':" public/profile.html
# Should all return icon mappings (e.g., 'discord': 'fa-discord')
```

---

## Expected Results Checklist

### Dark Mode
- [ ] Light theme + dark background = shows light gradient
- [ ] Dark theme + light background = shows dark gradient  
- [ ] Theme respects custom color only when matching
- [ ] CSS gradients not overridden by custom bgColor

### Social Media Icons  
- [ ] 40+ platforms in dropdown
- [ ] Categories organized (Social, Professional, Creative, etc.)
- [ ] WhatsApp, Discord, Telegram appear in "Messaging"
- [ ] Patreon, Quora appear in "Creator & Support"
- [ ] Icons render correctly on profile display

### Overall
- [ ] No JavaScript errors in console
- [ ] Mobile layout responsive
- [ ] All links clickable
- [ ] Copy profile URL works
- [ ] Theme toggle works correctly

---

## Troubleshooting

### Dark mode still not working?
- Clear browser cache (Cmd+Shift+R on Mac)
- Restart server: `pkill -f 'node server'` then `node server.js`

### Icons not showing?
- Check browser console (F12) for errors
- Verify FontAwesome 6.4.0 loaded: `Ctrl+Shift+K` (DevTools) → Network tab
- Ensure platform value matches iconMap key

### Platform dropdown not expanding?
- Check if optgroup syntax is valid (should see categories)
- Reload page completely

---

## Files to Check

1. **Dark Mode Fix**: `/public/profile.html` (lines ~710-730)
2. **Platform Dropdown**: `/public/index.html` (lines ~655-710)  
3. **Icon Mappings**: `/public/profile.html` (lines ~630-674)

---

**Last Updated**: November 30, 2025  
**Status**: Ready for Testing ✅
