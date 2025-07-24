#!/usr/bin/env python3
"""
Recurring Events Expander - Temporary Fix
==========================================
This script expands master recurring events into individual instances
when Power Automate's Get Calendar Events V4 fails to do so automatically.

Usage:
    python3 expand_recurring_events.py input_calendar.json output_calendar.json
"""

import json
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Any
import uuid

def parse_datetime(dt_string: str) -> datetime:
    """Parse various datetime formats from calendar data"""
    if not dt_string:
        return None
    
    # Handle timezone offset
    if '+' in dt_string:
        dt_string = dt_string.split('+')[0]
    elif 'Z' in dt_string:
        dt_string = dt_string.replace('Z', '')
    
    # Try different formats
    formats = [
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%d',
        '%Y-%m-%dT%H:%M:%S.%f'
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(dt_string, fmt)
        except ValueError:
            continue
    
    raise ValueError(f"Unable to parse datetime: {dt_string}")

def generate_recurring_instances(master_event: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate individual instances from a master recurring event"""
    instances = []
    
    # Extract recurrence info
    recurrence = master_event.get('recurrence', '').lower()
    if recurrence == 'none' or not recurrence:
        return [master_event]  # Not recurring, return as-is
    
    start_time_str = master_event.get('startTime', '')
    end_time_str = master_event.get('endTime', '')
    recurrence_end_str = master_event.get('recurrenceEndDate', '')
    
    if not all([start_time_str, end_time_str, recurrence_end_str]):
        print(f"⚠️  Skipping '{master_event.get('title', 'Unknown')}' - missing required fields")
        return [master_event]
    
    try:
        start_datetime = parse_datetime(start_time_str)
        end_datetime = parse_datetime(end_time_str)
        recurrence_end = parse_datetime(recurrence_end_str)
        
        # Calculate event duration
        event_duration = end_datetime - start_datetime
        
        # Generate instances based on recurrence pattern
        current_date = start_datetime
        instance_count = 0
        max_instances = 100  # Safety limit
        
        while current_date <= recurrence_end and instance_count < max_instances:
            # Create instance
            instance = master_event.copy()
            
            # Update times for this instance
            instance_end = current_date + event_duration
            
            # Format back to original string format (preserving timezone)
            if '+' in start_time_str:
                tz_suffix = '+' + start_time_str.split('+')[1]
            elif 'Z' in start_time_str:
                tz_suffix = 'Z'
            else:
                tz_suffix = '+00:00'  # Default timezone
            
            instance['startTime'] = current_date.strftime('%Y-%m-%dT%H:%M:%S') + tz_suffix
            instance['endTime'] = instance_end.strftime('%Y-%m-%dT%H:%M:%S') + tz_suffix
            
            # Generate unique iCalUld for this instance if missing
            if not instance.get('iCalUld'):
                base_uid = master_event.get('title', 'event').lower().replace(' ', '_')
                instance['iCalUld'] = f"{base_uid}_{current_date.strftime('%Y%m%d')}_{str(uuid.uuid4())[:8]}"
            else:
                # Append instance date to existing UID
                instance['iCalUld'] = f"{instance['iCalUld']}_{current_date.strftime('%Y%m%d')}"
            
            # Mark as instance (not master)
            instance['isRecurringInstance'] = True
            instance['recurringMasterId'] = master_event.get('iCalUld', f"master_{str(uuid.uuid4())[:8]}")
            
            instances.append(instance)
            instance_count += 1
            
            # Calculate next occurrence
            if recurrence == 'weekly':
                current_date += timedelta(weeks=1)
            elif recurrence == 'daily':
                current_date += timedelta(days=1)
            elif recurrence == 'monthly':
                # Simple monthly increment (same day next month)
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1)
            elif recurrence == 'yearly':
                current_date = current_date.replace(year=current_date.year + 1)
            else:
                print(f"⚠️  Unknown recurrence pattern: {recurrence}")
                break
        
        print(f"✅ Generated {len(instances)} instances for '{master_event.get('title', 'Unknown')}'")
        return instances
        
    except Exception as e:
        print(f"❌ Error processing '{master_event.get('title', 'Unknown')}': {e}")
        return [master_event]  # Return original on error

def expand_calendar_events(input_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Process all events and expand recurring ones"""
    expanded_events = []
    
    print("🔄 Processing calendar events...")
    print(f"📥 Input: {len(input_data)} events")
    
    recurring_count = 0
    for event in input_data:
        if not event or not isinstance(event, dict):
            continue
            
        recurrence = event.get('recurrence', '').lower()
        
        if recurrence and recurrence != 'none':
            recurring_count += 1
            instances = generate_recurring_instances(event)
            expanded_events.extend(instances)
        else:
            expanded_events.append(event)
    
    print(f"📊 Processed {recurring_count} recurring events")
    print(f"📤 Output: {len(expanded_events)} events")
    
    return expanded_events

def filter_events_for_date(events: List[Dict[str, Any]], target_date: str) -> List[Dict[str, Any]]:
    """Filter events for a specific date (YYYY-MM-DD format)"""
    filtered = []
    
    for event in events:
        start_time = event.get('startTime', '')
        if start_time.startswith(target_date):
            filtered.append(event)
    
    return filtered

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 expand_recurring_events.py <input_file> [output_file]")
        print("       python3 expand_recurring_events.py calendar_data.json expanded_calendar.json")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'expanded_calendar.json'
    
    try:
        # Load calendar data
        print(f"📂 Loading calendar data from {input_file}...")
        
        with open(input_file, 'r') as f:
            content = f.read()
        
        # Handle both JSON and HTML-embedded JSON
        if content.strip().startswith('['):
            data = json.loads(content)
        else:
            # Extract JSON from HTML response
            import re
            pattern = r'},{\"title\":'
            matches = list(re.finditer(pattern, content))
            if matches:
                start_pos = content.rfind('[{\"title\":', 0, matches[0].start() + 10)
                if start_pos == -1:
                    start_pos = content.rfind(',{\"title\":', 0, matches[0].start() + 10)
                    if start_pos != -1:
                        start_pos += 1
                
                json_content = content[start_pos:]
                bracket_count = 0
                end_pos = 0
                for i, char in enumerate(json_content):
                    if char == '[':
                        bracket_count += 1
                    elif char == ']':
                        bracket_count -= 1
                        if bracket_count == 0:
                            end_pos = i + 1
                            break
                
                json_content = json_content[:end_pos]
                data = json.loads(json_content)
            else:
                raise ValueError("No JSON data found in file")
        
        # Expand recurring events
        expanded_data = expand_calendar_events(data)
        
        # Save expanded calendar
        print(f"💾 Saving expanded calendar to {output_file}...")
        with open(output_file, 'w') as f:
            json.dump(expanded_data, f, indent=2)
        
        print("✅ Calendar expansion completed!")
        
        # Show July 24th analysis
        print("\n🎯 JULY 24TH, 2025 ANALYSIS:")
        print("="*40)
        july_24_events = filter_events_for_date(expanded_data, '2025-07-24')
        print(f"Events found for July 24th: {len(july_24_events)}")
        
        for i, event in enumerate(july_24_events, 1):
            title = event.get('title', 'No title')
            start_time = event.get('startTime', '')
            is_instance = event.get('isRecurringInstance', False)
            print(f"{i:2d}. {title[:50]}")
            print(f"    Time: {start_time}")
            print(f"    Type: {'Recurring Instance' if is_instance else 'Single Event'}")
            print()
        
        # Highlight the originally missing events
        print("🔍 ORIGINALLY MISSING EVENTS CHECK:")
        print("-"*35)
        
        missing_found = 0
        for event in july_24_events:
            title = event.get('title', '').lower()
            if 'retail quality control scorecard' in title:
                print(f"✅ Found: Retail Quality Control Scorecard")
                missing_found += 1
            elif 'mobile coverage check' in title and 'mandatory' in title:
                print(f"✅ Found: (Mandatory) Mobile Coverage Check")
                missing_found += 1
        
        print(f"\n📈 Recovery Success: {missing_found}/2 originally missing events now found!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()