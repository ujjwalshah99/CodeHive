```javascript
/**
* isPrime - Checks if a number is prime.
*
* A prime number is a natural number greater than 1 that has no positive divisors other than 1 and itself.
*
* @param {number} number - The number to check for primality.
* @returns {boolean} - True if the number is prime, false otherwise.
*
* @throws {TypeError} - If the input is not a number.
* @throws {Error} - If the input number is not a positive integer.
*/
const isPrime = (number) => {
// Input validation: check if the input is a number
if (typeof number !== 'number') {
throw new TypeError('Input must be a number.');
}


// Input validation: check if the number is a positive integer
if (!Number.isInteger(number) || number <= 0) { throw new Error('Input must be a positive integer.'); } // Edge case: 1
    is not a prime number if (number===1) { return false; } // Edge case: 2 is the smallest prime number if (number===2)
    { return true; } // Optimization: check if the number is even. If so, it's not prime (except for 2) if (number %
    2===0) { return false; } // Iterate from 3 up to the square root of the number, checking for divisibility // We only
    need to check odd numbers, so we increment by 2 for (let i=3; i <=Math.sqrt(number); i +=2) { if (number % i===0) {
    return false; // If divisible, it's not prime } } // If no divisors were found, the number is prime return true; };
    // Example usage: try { console.log('Is 17 prime?', isPrime(17)); // true console.log('Is 25 prime?', isPrime(25));
    // false console.log('Is 1 prime?', isPrime(1)); // false console.log('Is 2 prime?', isPrime(2)); // true // Example
    of error handling: // console.log('Is -5 prime?', isPrime(-5)); // Throws an error // console.log('Is "hello"
    prime?', isPrime("hello")); // Throws a TypeError } catch (error) { console.error(error.message); } /** *
    generatePrimes - Generates an array of prime numbers up to a given limit. * * @param {number} limit - The upper
    limit for generating prime numbers. * @returns {number[]} - An array containing all prime numbers up to the limit. *
    * @throws {TypeError} - If the input is not a number. * @throws {Error} - If the input limit is not a positive
    integer. */ const generatePrimes=(limit)=> {
    // Input validation: check if the input is a number
    if (typeof limit !== 'number') {
    throw new TypeError('Limit must be a number.');
    }


    // Input validation: check if the limit is a positive integer
    if (!Number.isInteger(limit) || limit <= 0) { throw new Error('Limit must be a positive integer.'); } // Array to
        store prime numbers const primes=[]; // Iterate from 2 up to the limit for (let i=2; i <=limit; i++) { if
        (isPrime(i)) { primes.push(i); // If the number is prime, add it to the array } } return primes; }; // Example
        usage: try { console.log('Primes up to 20:', generatePrimes(20)); // [2, 3, 5, 7, 11, 13, 17, 19]
        console.log('Primes up to 10:', generatePrimes(10)); // [2, 3, 5, 7] // Example of error handling: //
        console.log('Primes up to -5:', generatePrimes(-5)); // Throws an error // console.log('Primes up to "abc" :',
        generatePrimes("abc")); // Throws a TypeError } catch (error) { console.error(error.message); } ```