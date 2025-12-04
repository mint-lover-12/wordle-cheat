install tampermonkey from https://chromewebstore.google.com/   (look up tampermonkey), and then make a new script and paste in the contents of `index.js`
then go to wordle (https://www.nytimes.com/games/wordle/index.html).

use the nice panel, the first word is mathematically the best. bot mode works well. The 'bars' next to each word indicate their 'rating' (in relation to each other). 
will attach stats after I use it more, but i beat wordles bot :)


also stop button doesnt work idrc abt it

**mode explanation**

the normal mode (not entropy), effectively tries to get green / eliminate options. It will guess 'spoon', simply because 90% of words start with an 's'. 
Entropy tries to eliminate as many options as possible - doesnt care about greens. An example of this is if you have
_IGHT. The normal mode will try SIGHT, then NIGHT, then LIGHT... 
The entropy will try FLOWN. Why? FLOWN would eliminate or configm: Night, Fight AND Light in ONE go. You get the idea.

An example was with the wordle 'tulip'.
Entropy OFF:


<img width="242" height="274" alt="image" src="https://github.com/user-attachments/assets/f1a169a3-5d81-4061-aae1-9af267bcc52c" />

Entropy ON:


<img width="232" height="274" alt="image" src="https://github.com/user-attachments/assets/11b0967c-e872-4441-a34f-9161be282241" />

Obviously there isnt much of a difference, Entropy might be a lot better if there was like MASSIVE wordle, but it also uses a lot of computing power. 

If we compare with the 'preset' word disabled, we can see that.



Entropy OFF:

<img width="228" height="270" alt="image" src="https://github.com/user-attachments/assets/565827e3-2573-49e5-bbfa-6380a8eeb88e" />


Entropy ON:

<img width="227" height="266" alt="image" src="https://github.com/user-attachments/assets/d57a09c4-0df5-4a46-97e7-688995336e6c" />


obviously there isnt a massive gap, but for some puzzles (like the _IGHT one i mentioned), this is a very big difference.


Recommended settings:
Preset: ON (use ONE preset word, which should be: salet or stale)
Entropy: ON


**technical**
- 
for this i needed:
To get wordles wordlist.
I got it, then I just pull letters and their colours, compare, and zamnnmnmn
algorithm is quite good, probably the best for an accuracy|time ratio.

overall pretty easy to do, cant wait for wordle to add an anticheat ;)

