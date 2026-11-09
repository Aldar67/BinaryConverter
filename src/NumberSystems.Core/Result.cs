namespace NumberSystems.Core;

public enum ErrorCode
{
    EmptyInput,
    TooManyDigits,
    NegativeNumber,
    InvalidDigit,
    RadixOutOfRange,
    ValueOutOfRange,
    IndexOutOfRange,
    InvalidAnswer,
}

/// <param name="Position">Индекс символа во введённой строке (слева, с 0) — чтобы подсветить ошибку в UI.</param>
public sealed record ConversionError(ErrorCode Code, string Message, int? Position = null);

/// <summary>Результат без исключений: ошибки ввода — ожидаемая ситуация, а не сбой.</summary>
public sealed class Result<T>
{
    private Result(T? value, ConversionError? error)
    {
        Value = value;
        Error = error;
    }

    public T? Value { get; }
    public ConversionError? Error { get; }
    public bool IsSuccess => Error is null;

    public static Result<T> Ok(T value) => new(value, null);
    public static Result<T> Fail(ConversionError error) => new(default, error);
    public static Result<T> Fail(ErrorCode code, string message, int? position = null) =>
        new(default, new ConversionError(code, message, position));
}
