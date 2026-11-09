namespace NumberSystems.Core;

/// <summary>Dividend = Divisor · Quotient + Remainder.</summary>
public sealed record DivisionStep(
    int Index,
    int Dividend,
    int Divisor,
    int Quotient,
    int Remainder,
    char RemainderSymbol);

/// <param name="Steps">В порядке выполнения делений: первый остаток — младшая цифра.</param>
/// <param name="Digits">Запись в новой системе: остатки в обратном порядке.</param>
public sealed record DivisionResult(int Value, int Radix, IReadOnlyList<DivisionStep> Steps, string Digits);

/// <summary>Перевод из десятичной системы последовательным делением с остатком.</summary>
public static class DivisionChain
{
    /// <summary>Строка разбирается тем же валидатором, что и в прямом переводе, с основанием 10.</summary>
    public static Result<DivisionResult> FromDecimal(string? input, int radix)
    {
        var parsed = PositionalExpansion.ToDecimal(input, 10);
        return parsed.IsSuccess
            ? FromDecimal(parsed.Value!.Value, radix)
            : Result<DivisionResult>.Fail(parsed.Error!);
    }

    public static Result<DivisionResult> FromDecimal(int value, int radix)
    {
        if (DigitAlphabet.ValidateRadix(radix) is { } radixError)
            return Result<DivisionResult>.Fail(radixError);

        if (value is < 0 or > Limits.MaxValue)
            return Result<DivisionResult>.Fail(ErrorCode.ValueOutOfRange,
                $"Число должно быть от 0 до {Limits.MaxValue}.");

        var steps = new List<DivisionStep>();
        var dividend = value;

        // do-while: для нуля получается ровно один шаг 0 = b·0 + 0 и запись «0».
        do
        {
            var quotient = dividend / radix;
            var remainder = dividend % radix;
            steps.Add(new DivisionStep(steps.Count, dividend, radix, quotient, remainder,
                DigitAlphabet.ToSymbol(remainder)));
            dividend = quotient;
        } while (dividend > 0);

        var digits = new string(steps.Select(s => s.RemainderSymbol).Reverse().ToArray());
        return Result<DivisionResult>.Ok(new DivisionResult(value, radix, steps, digits));
    }
}
