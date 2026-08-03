import os
import sys
import time
import subprocess
import re

def natural_sort_key(s):
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]

def copy_text_to_clipboard(text):
    process = subprocess.Popen(['pbcopy'], stdin=subprocess.PIPE)
    process.communicate(text.encode('utf-8'))

def copy_image_to_clipboard(file_path):
    applescript = f'''
    use framework "AppKit"
    use scripting additions
    
    set posixPath to "{file_path}"
    set theImage to current application's NSImage's alloc()'s initWithContentsOfFile:posixPath
    set theClip to current application's NSPasteboard's generalPasteboard()
    theClip's clearContents()
    theClip's writeObjects:{{theImage}}
    '''
    process = subprocess.Popen(['osascript'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = process.communicate(applescript.encode('utf-8'))
    if process.returncode != 0:
        return False, stderr.decode('utf-8')
    return True, None

def paste_action():
    applescript = '''
    tell application "System Events"
        keystroke "v" using {command down}
    end tell
    '''
    subprocess.run(['osascript', '-e', applescript])

def press_enter():
    applescript = '''
    tell application "System Events"
        key code 36 -- Return key
    end tell
    '''
    subprocess.run(['osascript', '-e', applescript])

def main():
    image_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Supported image extensions
    valid_extensions = ('.png', '.jpg', '.jpeg', '.gif')
    
    # Get and sort images
    all_files = os.listdir(image_dir)
    images = [f for f in all_files if f.lower().endswith(valid_extensions)]
    images.sort(key=natural_sort_key)
    
    total = len(images)
    if total == 0:
        print("No images found in this directory!")
        return

    print("=" * 60)
    print(f"Found {total} images to insert.")
    print("=" * 60)
    print("First 5 files:")
    for f in images[:5]:
        print(f" - {f}")
    if total > 5:
        print(f" ... and {total - 5} more.")
    print("=" * 60)
    
    print("\nIMPORTANT STEPS BEFORE STARTING:")
    print("1. Open Google Chrome and go to the Google Doc:")
    print("   https://docs.google.com/document/d/1mVHzL1smr8cAFoSQsDzOllaIVkHkGLblOrZcNHt1Rks/edit?usp=sharing")
    print("2. Click inside the document editor so your cursor is blinking where you want the images to start.")
    print("3. Ensure the Terminal has Accessibility permission in System Settings -> Privacy & Security -> Accessibility.")
    print("4. Press Enter here, then IMMEDIATELY switch back to Google Chrome so it is the active window.")
    
    input("\nPress Enter to begin the 5-second countdown...")
    
    for i in range(5, 0, -1):
        print(f"Starting in {i}...")
        time.sleep(1)
        
    print("\nStarting paste process. Press Ctrl+C in this terminal to abort.")
    time.sleep(0.5)
    
    for idx, filename in enumerate(images, 1):
        print(f"[{idx}/{total}] Inserting: {filename}")
        
        # 1. Copy the filename (without extension)
        name_to_paste = os.path.splitext(filename)[0]
        copy_text_to_clipboard(name_to_paste)
        time.sleep(0.1)
        
        # 2. Paste filename
        paste_action()
        time.sleep(0.2)
        
        # 3. Press Enter
        press_enter()
        time.sleep(0.2)
        
        # 4. Copy image to clipboard
        img_path = os.path.join(image_dir, filename)
        success, err = copy_image_to_clipboard(img_path)
        if not success:
            print(f"  Error copying image: {err}")
            continue
        time.sleep(0.2)
        
        # 5. Paste image
        paste_action()
        time.sleep(1.0)  # Wait for Google Docs to start processing the image upload
        
        # 6. Press Enter twice to create spacing for the next item
        press_enter()
        time.sleep(0.2)
        press_enter()
        time.sleep(0.2)

    print("\nFinished! All images have been pasted successfully.")

if __name__ == "__main__":
    main()
