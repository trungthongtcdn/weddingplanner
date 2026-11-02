import { REGION_LABEL } from "@/lib/rituals";
import { REGIONS, type Region } from "@/lib/db/schema";

type Values = {
  groomName?: string;
  brideName?: string;
  groomRegion?: Region;
  brideRegion?: Region;
  groomProvince?: string | null;
  brideProvince?: string | null;
  weddingDate?: string;
  groomBirthYear?: number | null;
  brideBirthYear?: number | null;
};

function RegionSelect({ name, value, id }: { name: string; value?: Region; id: string }) {
  return (
    <select id={id} name={name} className="field" defaultValue={value ?? "BAC"}>
      {REGIONS.map((r) => (
        <option key={r} value={r}>
          {REGION_LABEL[r]}
        </option>
      ))}
    </select>
  );
}

/** Nhóm ô nhập thông tin đám cưới, dùng cho cả tạo mới và sửa. */
export function WeddingFields({ v = {} }: { v?: Values }) {
  return (
    <>
      <fieldset className="space-y-3">
        <legend className="mb-2 text-[1.05rem] font-semibold">Nhà trai</legend>
        <div>
          <label className="label" htmlFor="groomName">
            Tên chú rể
          </label>
          <input id="groomName" name="groomName" className="field" defaultValue={v.groomName} placeholder="Ví dụ: Minh" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="groomRegion">
              Quê ở
            </label>
            <RegionSelect id="groomRegion" name="groomRegion" value={v.groomRegion} />
          </div>
          <div>
            <label className="label" htmlFor="groomProvince">
              Tỉnh/thành
            </label>
            <input id="groomProvince" name="groomProvince" className="field" defaultValue={v.groomProvince ?? ""} placeholder="Nghệ An" />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-[1.05rem] font-semibold">Nhà gái</legend>
        <div>
          <label className="label" htmlFor="brideName">
            Tên cô dâu
          </label>
          <input id="brideName" name="brideName" className="field" defaultValue={v.brideName} placeholder="Ví dụ: Lan" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="brideRegion">
              Quê ở
            </label>
            <RegionSelect id="brideRegion" name="brideRegion" value={v.brideRegion} />
          </div>
          <div>
            <label className="label" htmlFor="brideProvince">
              Tỉnh/thành
            </label>
            <input id="brideProvince" name="brideProvince" className="field" defaultValue={v.brideProvince ?? ""} placeholder="TP. Hồ Chí Minh" />
          </div>
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="weddingDate">
          Ngày cưới (dự kiến)
        </label>
        <input id="weddingDate" name="weddingDate" type="date" className="field" defaultValue={v.weddingDate} required />
        <p className="hint">Ngày âm lịch và các lưu ý phong tục sẽ hiện ở trang tổng quan.</p>
      </div>

      <details className="rounded-xl border border-line bg-surface px-3.5 py-3">
        <summary className="cursor-pointer font-medium">Năm sinh (không bắt buộc)</summary>
        <p className="hint mb-3">Dùng để hiện lưu ý về tuổi theo cách tính phổ biến, chỉ mang tính tham khảo.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="groomBirthYear">
              Chú rể
            </label>
            <input id="groomBirthYear" name="groomBirthYear" inputMode="numeric" className="field" defaultValue={v.groomBirthYear ?? ""} placeholder="1996" />
          </div>
          <div>
            <label className="label" htmlFor="brideBirthYear">
              Cô dâu
            </label>
            <input id="brideBirthYear" name="brideBirthYear" inputMode="numeric" className="field" defaultValue={v.brideBirthYear ?? ""} placeholder="1998" />
          </div>
        </div>
      </details>
    </>
  );
}
