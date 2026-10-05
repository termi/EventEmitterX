### Date/Time and Timestamp Retrieval Rules

When an AI agent needs to generate a date/time string or timestamp, use this strict fallback order:

1. Try a `nodejs` script first.
2. If `nodejs` fails (command/script error), try `Python`.
3. If `Python` also fails, use equivalent shell commands for the **current shell** and requested format.

#### Local date/time according CLDR/ICU

Locale date and time is shown in the format that is commonly used in the user's region, including local time zone,
date order (e.g. day/month/year vs month/day/year), and local language for month names if applicable.

* In `nodejs`: For CLDR/ICU "Local datetime", "Local date", "Local time", use locale-aware APIs: `Date.toLocaleString()`, `Date.toLocaleDateString()`, `Date.toLocaleTimeString()`.
* In `Python`: For CLDR/ICU "Local datetime", "Local date", "Local time", use `locale.localeconv` together with `now.strftime` to format the output according to the user's locale settings.
* If the user asks for a date/time format that is not supported by default `nodejs` and `Python` formatting capabilities, use shell commands.
* Use shell commands with default formatting only when both `nodejs` and `Python` are unavailable/failed, or the requested format requires shell-specific formatting.

#### Milliseconds since epoch

When an AI agent needs to generate a "Milliseconds since epoch":

* Use `Date.now()` in `nodejs`
* Use `date +%s%3N` in shell (or PowerShell equivalent)
* Use `int(time.time() * 1000)` in `Python`
* Get "Unix timestamp" (seconds since epoch) and multiply by 1000 if the environment does not support direct milliseconds retrieval
