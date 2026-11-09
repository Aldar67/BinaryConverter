namespace NumberSystems.Core;

/// <summary>Один разряд: карточка цифры над весом и её вклад в сумму.</summary>
/// <param name="Position">Номер разряда справа налево, с 0 (показатель степени).</param>
/// <param name="RunningSum">Сумма вкладов от старшего разряда до этого включительно.</param>
public sealed record DigitTerm(
    int Position,
    char Symbol,
    int DigitValue,
    long Weight,
    int Contribution,
    int RunningSum);

/// <param name="Terms">От старшего разряда к младшему — в порядке записи числа.</param>
public sealed record ExpansionResult(string Digits, int Radix, IReadOnlyList<DigitTerm> Terms, int Value);

/// <summary>Перевод в десятичную систему через разрядное разложение.</summary>
public static class PositionalExpansion
{
    public static Result<ExpansionResult> ToDecimal(string? input, int radix)
    {
        if (DigitAlphabet.ValidateRadix(radix) is { } radixError)
            return Result<ExpansionResult>.Fail(radixError);

        var digits = (input ?? string.Empty).Trim().ToUpperInvariant();

        if (digits.Length == 0)
            return Result<ExpansionResult>.Fail(ErrorCode.EmptyInput, "Введите число.");

        if (digits[0] == '-')
            return Result<ExpansionResult>.Fail(ErrorCode.NegativeNumber,
                "Допустимы только неотрицательные целые числа.", 0);

        if (digits.Length > Limits.MaxDigits)
            return Result<ExpansionResult>.Fail(ErrorCode.TooManyDigits,
                $"Слишком длинная запись: не больше {Limits.MaxDigits} цифр.");

        var values = new int[digits.Length];
        for (var i = 0; i < digits.Length; i++)
        {
            if (!DigitAlphabet.TryGetValue(digits[i], out values[i]) || values[i] >= radix)
                return Result<ExpansionResult>.Fail(ErrorCode.InvalidDigit,
                    $"Символ «{digits[i]}» недопустим в системе с основанием {radix} " +
                    $"(допустимы {DigitAlphabet.DescribeAllowed(radix)}).", i);
        }

        var terms = new List<DigitTerm>(digits.Length);
        long sum = 0;
        for (var i = 0; i < digits.Length; i++)
        {
            var position = digits.Length - 1 - i;
            var weight = Pow(radix, position);
            sum += values[i] * weight;

            // Сумма только растёт, поэтому выход за границу виден сразу.
            if (sum > Limits.MaxValue)
                return Result<ExpansionResult>.Fail(ErrorCode.ValueOutOfRange,
                    $"Число больше {Limits.MaxValue} в десятичной системе.");

            terms.Add(new DigitTerm(position, digits[i], values[i], weight,
                (int)(values[i] * weight), (int)sum));
        }

        return Result<ExpansionResult>.Ok(new ExpansionResult(digits, radix, terms, (int)sum));
    }

    // MaxDigits = 12, поэтому 16^11 укладывается в long.
    private static long Pow(int radix, int exponent)
    {
        long result = 1;
        for (var i = 0; i < exponent; i++) result *= radix;
        return result;
    }
}
